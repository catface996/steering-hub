package com.steeringhub.steering.service;

import com.steeringhub.domain.model.steering.ReviewAction;
import com.steeringhub.domain.model.steering.SteeringStatus;
import com.steeringhub.common.exception.BusinessException;
import com.steeringhub.common.response.ResultCode;
import com.steeringhub.steering.dto.request.UpdateSteeringRequest;
import com.steeringhub.steering.entity.Steering;
import com.steeringhub.steering.entity.SteeringReview;
import com.steeringhub.steering.entity.SteeringVersion;
import com.steeringhub.steering.mapper.SteeringCategoryMapper;
import com.steeringhub.steering.mapper.SteeringMapper;
import com.steeringhub.steering.mapper.SteeringReviewMapper;
import com.steeringhub.steering.mapper.SteeringVersionMapper;
import com.steeringhub.steering.mapper.StopWordMapper;
import com.steeringhub.steering.service.impl.SteeringServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.services.bedrockruntime.BedrockRuntimeClient;
import software.amazon.awssdk.services.bedrockruntime.model.InvokeModelRequest;
import software.amazon.awssdk.services.bedrockruntime.model.InvokeModelResponse;

import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * SteeringServiceImpl 单元测试
 *
 * 依据规范：AAA 模式（Arrange / Act / Assert），每个测试只验证一个行为。
 * SteeringServiceImpl 继承 ServiceImpl<SteeringMapper, Steering>，
 * baseMapper 由 Spring @Autowired 注入，@InjectMocks 的构造器注入不覆盖父类字段，
 * 需在 @BeforeEach 中通过 ReflectionTestUtils 手动注入。
 */
@ExtendWith(MockitoExtension.class)
class SteeringServiceImplTest {

    @Mock private SteeringMapper steeringMapper;
    @Mock private SteeringVersionMapper steeringVersionMapper;
    @Mock private SteeringReviewMapper steeringReviewMapper;
    @Mock private SteeringCategoryMapper steeringCategoryMapper;
    @Mock private StopWordMapper stopWordMapper;
    @Mock private BedrockRuntimeClient bedrockRuntimeClient;

    @InjectMocks
    private SteeringServiceImpl steeringService;

    @BeforeEach
    void injectBaseMapper() {
        // ServiceImpl.baseMapper 是父类字段，@InjectMocks 只注入构造参数，不覆盖父类 @Autowired 字段
        ReflectionTestUtils.setField(steeringService, "baseMapper", steeringMapper);
    }

    // =========================================================================
    // handleActivate 场景
    // =========================================================================

    @Test
    void reviewSteering_activate_success() {
        // Arrange
        Long id = 1L;
        Steering steering = buildSteering(id, SteeringStatus.APPROVED, 1, 0);
        SteeringVersion approvedVersion = buildVersion(id, 1, "approved");
        approvedVersion.setContent("# 规范内容\n单元测试 Service 规范");

        when(steeringMapper.selectById(id)).thenReturn(steering);
        when(steeringMapper.claimActivateLock(id, 0)).thenReturn(1);
        when(steeringVersionMapper.findVersionBySteeringIdAndStatus(id, "approved"))
                .thenReturn(approvedVersion);
        InvokeModelResponse bedrockResponse = mockBedrockResponse(buildEmbeddingJson(3));
        when(bedrockRuntimeClient.invokeModel(any(InvokeModelRequest.class)))
                .thenReturn(bedrockResponse);
        when(steeringVersionMapper.updateVersionStatus(anyLong(), anyString(), anyString()))
                .thenReturn(1);
        when(steeringMapper.commitActivate(anyLong(), any(), any(), any(), any(), any(), any()))
                .thenReturn(1);
        when(steeringReviewMapper.insert(any(SteeringReview.class))).thenReturn(1);

        // Act
        steeringService.reviewSteering(id, ReviewAction.ACTIVATE, "LGTM", null, "admin");

        // Assert: 乐观锁 CAS 被调用
        verify(steeringMapper).claimActivateLock(id, 0);
        // Assert: Bedrock embedding 被调用
        verify(bedrockRuntimeClient).invokeModel(any(InvokeModelRequest.class));
        // Assert: 旧 active 版本被标记为 superseded
        verify(steeringVersionMapper).updateVersionStatus(id, "active", "superseded");
        // Assert: approved 版本激活
        verify(steeringVersionMapper).updateVersionStatus(id, "approved", "active");
        // Assert: commitActivate 携带非空 embedding
        verify(steeringMapper).commitActivate(
                eq(id), any(), any(), any(), any(),
                argThat(s -> s != null && s.startsWith("[")),
                argThat(s -> s != null && s.startsWith("["))
        );
    }

    @Test
    void reviewSteering_activate_lockConflict_throws409() {
        // Arrange: CAS 返回 0，表示并发冲突
        Long id = 1L;
        Steering steering = buildSteering(id, SteeringStatus.APPROVED, 1, 0);

        when(steeringMapper.selectById(id)).thenReturn(steering);
        when(steeringMapper.claimActivateLock(id, 0)).thenReturn(0);

        // Act & Assert
        assertThatThrownBy(() ->
                steeringService.reviewSteering(id, ReviewAction.ACTIVATE, null, null, "admin"))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex ->
                        assertThat(((BusinessException) ex).getCode())
                                .as("应返回 STEERING_STATUS_INVALID(1002) 表示并发冲突")
                                .isEqualTo(ResultCode.STEERING_STATUS_INVALID.getCode()));

        // Assert: Bedrock 未被调用，事务提前终止
        verify(bedrockRuntimeClient, never()).invokeModel(any(InvokeModelRequest.class));
        verify(steeringMapper, never()).commitActivate(anyLong(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void reviewSteering_activate_embeddingFail_throwsEmbeddingFailedAndPreventsCommit() {
        // Arrange: Bedrock 抛出异常
        Long id = 1L;
        Steering steering = buildSteering(id, SteeringStatus.APPROVED, 1, 0);
        SteeringVersion approvedVersion = buildVersion(id, 1, "approved");

        when(steeringMapper.selectById(id)).thenReturn(steering);
        when(steeringMapper.claimActivateLock(id, 0)).thenReturn(1);
        when(steeringVersionMapper.findVersionBySteeringIdAndStatus(id, "approved"))
                .thenReturn(approvedVersion);
        when(bedrockRuntimeClient.invokeModel(any(InvokeModelRequest.class)))
                .thenThrow(new RuntimeException("Bedrock service unavailable"));

        // Act & Assert: 应抛出 EMBEDDING_FAILED，commitActivate 不被调用（事务回滚）
        assertThatThrownBy(() ->
                steeringService.reviewSteering(id, ReviewAction.ACTIVATE, null, null, "admin"))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex ->
                        assertThat(((BusinessException) ex).getCode())
                                .as("Bedrock 失败应映射为 EMBEDDING_FAILED(2001)")
                                .isEqualTo(ResultCode.EMBEDDING_FAILED.getCode()));

        verify(steeringMapper, never()).commitActivate(anyLong(), any(), any(), any(), any(), any(), any());
    }

    // =========================================================================
    // handleWithdraw 场景
    // =========================================================================

    @Test
    void reviewSteering_withdraw_pendingReview_backToDraft() {
        // Arrange: 主表 status = PENDING_REVIEW（无 active 版本，纯新规范流程）
        Long id = 1L;
        Steering steering = buildSteering(id, SteeringStatus.PENDING_REVIEW, 1, 0);

        when(steeringMapper.selectById(id)).thenReturn(steering);
        when(steeringVersionMapper.updateVersionStatus(id, "pending_review", "draft")).thenReturn(1);
        when(steeringMapper.updateById(any(Steering.class))).thenReturn(1);
        when(steeringReviewMapper.insert(any(SteeringReview.class))).thenReturn(1);

        // Act
        steeringService.reviewSteering(id, ReviewAction.WITHDRAW, null, null, "admin");

        // Assert: 版本状态回退为 draft
        verify(steeringVersionMapper).updateVersionStatus(id, "pending_review", "draft");
        // Assert: 主表 status 重置为 DRAFT
        verify(steeringMapper).updateById(argThat((Steering s) -> s.getStatus() == SteeringStatus.DRAFT));
    }

    // =========================================================================
    // updateSteering 场景
    // =========================================================================

    @Test
    void updateSteering_activeSpec_createsDraftVersion_doesNotModifyMainTable() {
        // Arrange: 规范已 active，编辑时只插入新 draft 版本，不修改主表
        Long id = 1L;
        Steering activeSteering = buildSteering(id, SteeringStatus.ACTIVE, 2, 0);

        UpdateSteeringRequest request = new UpdateSteeringRequest();
        request.setTitle("Updated Title");
        request.setContent("Updated Content");
        request.setChangeLog("v3 草稿");

        when(steeringMapper.selectById(id)).thenReturn(activeSteering);
        when(steeringVersionMapper.findVersionBySteeringIdAndStatus(id, "pending_review"))
                .thenReturn(null);
        when(steeringVersionMapper.selectMaxVersionBySteeringId(id)).thenReturn(2);
        when(steeringVersionMapper.insert(any(SteeringVersion.class))).thenReturn(1);

        // Act
        steeringService.updateSteering(id, request);

        // Assert: 插入了新 draft 版本，内容与请求一致
        verify(steeringVersionMapper).insert(argThat((SteeringVersion v) ->
                "draft".equals(v.getStatus())
                        && "Updated Content".equals(v.getContent())
                        && "Updated Title".equals(v.getTitle())
        ));
        // Assert: 主表 updateById 未被调用（active 规范热缓存不动）
        verify(steeringMapper, never()).updateById(any(Steering.class));
    }

    @Test
    void updateSteering_duplicatePendingReview_throwsConflict() {
        // Arrange: 已存在 pending_review 版本，不允许再次提交编辑
        Long id = 1L;
        Steering activeSteering = buildSteering(id, SteeringStatus.ACTIVE, 2, 0);
        SteeringVersion pendingVersion = buildVersion(id, 2, "pending_review");

        UpdateSteeringRequest request = new UpdateSteeringRequest();
        request.setTitle("Another Edit");
        request.setContent("Another Content");

        when(steeringMapper.selectById(id)).thenReturn(activeSteering);
        when(steeringVersionMapper.findVersionBySteeringIdAndStatus(id, "pending_review"))
                .thenReturn(pendingVersion);

        // Act & Assert
        assertThatThrownBy(() -> steeringService.updateSteering(id, request))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex ->
                        assertThat(((BusinessException) ex).getCode())
                                .isEqualTo(ResultCode.STEERING_STATUS_INVALID.getCode()))
                .hasMessageContaining("待审核版本");

        verify(steeringVersionMapper, never()).insert(any(SteeringVersion.class));
    }

    // =========================================================================
    // 辅助方法
    // =========================================================================

    private Steering buildSteering(Long id, SteeringStatus status, int currentVersion, int lockVersion) {
        Steering s = new Steering();
        s.setId(id);
        s.setTitle("Test Steering");
        s.setContent("# Test content");
        s.setStatus(status);
        s.setCurrentVersion(currentVersion);
        s.setLockVersion(lockVersion);
        s.setDeleted(false);
        return s;
    }

    private SteeringVersion buildVersion(Long steeringId, int version, String status) {
        SteeringVersion v = new SteeringVersion();
        v.setId((long) version);
        v.setSteeringId(steeringId);
        v.setVersion(version);
        v.setTitle("Version " + version);
        v.setContent("Content v" + version);
        v.setStatus(status);
        return v;
    }

    private String buildEmbeddingJson(int dims) {
        StringBuilder sb = new StringBuilder("{\"embedding\":[");
        for (int i = 0; i < dims; i++) {
            if (i > 0) sb.append(",");
            sb.append("0.").append(i + 1);
        }
        sb.append("]}");
        return sb.toString();
    }

    private InvokeModelResponse mockBedrockResponse(String json) {
        InvokeModelResponse response = mock(InvokeModelResponse.class);
        when(response.body()).thenReturn(SdkBytes.fromUtf8String(json));
        return response;
    }
}
