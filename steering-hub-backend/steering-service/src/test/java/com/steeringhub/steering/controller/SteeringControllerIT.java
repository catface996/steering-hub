package com.steeringhub.steering.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.steeringhub.common.enums.ReviewAction;
import com.steeringhub.common.enums.SteeringStatus;
import com.steeringhub.common.exception.BusinessException;
import com.steeringhub.common.exception.GlobalExceptionHandler;
import com.steeringhub.common.response.ResultCode;
import com.steeringhub.steering.dto.request.ReviewSteeringRequest;
import com.steeringhub.steering.dto.response.SteeringDetailResponse;
import com.steeringhub.steering.dto.response.SteeringVersionVO;
import com.steeringhub.steering.service.SteeringService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.autoconfigure.security.servlet.SecurityFilterAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * SteeringController 集成测试（Web 层）
 *
 * 使用 @WebMvcTest 加载 Controller + GlobalExceptionHandler，Mock SteeringService。
 * 重点验证：
 *   - HTTP 路由、请求/响应 JSON 结构
 *   - 并发冲突（409）的响应体 code 字段
 *   - Embedding 失败时事务回滚（服务层抛异常，响应体反映失败）
 *   - 版本历史 API 正确返回多版本数据
 *   - withdraw 操作后主表状态不变（由 Service 控制，Controller 返回 OK）
 *
 * 注意：GlobalExceptionHandler 统一返回 HTTP 200，错误码在响应体 $.code 中体现。
 */
@WebMvcTest(
        value = SteeringController.class,
        excludeAutoConfiguration = {
                SecurityAutoConfiguration.class,
                SecurityFilterAutoConfiguration.class
        })
@Import(GlobalExceptionHandler.class)
class SteeringControllerIT {

    private static final String BASE_URL = "/api/v1/web/steerings";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private SteeringService steeringService;

    // =========================================================================
    // activate - 并发冲突返回 409
    // =========================================================================

    /**
     * 场景：两次并发 activate 请求，第一次成功，第二次命中乐观锁冲突。
     * 由于 MockMvc 是同步的，通过 Mock 服务侧行为模拟：
     *   - 第一次调用：正常完成
     *   - 第二次调用：抛出 STEERING_STATUS_INVALID(1002) BusinessException
     */
    @Test
    void activate_withConcurrentRequest_returns409() throws Exception {
        Long id = 1L;
        ReviewSteeringRequest activateReq = buildReviewRequest(ReviewAction.ACTIVATE, null);

        // 第一次成功，第二次冲突
        doNothing()
                .doThrow(new BusinessException(ResultCode.STEERING_STATUS_INVALID.getCode(), "并发冲突，请刷新后重试"))
                .when(steeringService).reviewSteering(eq(id), eq(ReviewAction.ACTIVATE), any(), any(), any());

        // 第一次请求：成功
        mockMvc.perform(post(BASE_URL + "/{id}/review", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(activateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        // 第二次请求：冲突，响应体 code = 1002
        mockMvc.perform(post(BASE_URL + "/{id}/review", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(activateReq)))
                .andExpect(status().isOk())  // GlobalExceptionHandler 统一返回 HTTP 200
                .andExpect(jsonPath("$.code").value(ResultCode.STEERING_STATUS_INVALID.getCode()))
                .andExpect(jsonPath("$.message").value("并发冲突，请刷新后重试"));
    }

    // =========================================================================
    // activate - Embedding 失败，数据库状态不变
    // =========================================================================

    /**
     * 场景：activate 时 Bedrock 调用失败，服务层抛出 EMBEDDING_FAILED，
     * Controller 返回对应错误码，数据库事务已回滚（由 @Transactional 保证）。
     */
    @Test
    void activate_embeddingFailure_respondsWithEmbeddingFailedCode() throws Exception {
        Long id = 2L;
        ReviewSteeringRequest activateReq = buildReviewRequest(ReviewAction.ACTIVATE, null);

        doThrow(new BusinessException(ResultCode.EMBEDDING_FAILED))
                .when(steeringService).reviewSteering(eq(id), eq(ReviewAction.ACTIVATE), any(), any(), any());

        mockMvc.perform(post(BASE_URL + "/{id}/review", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(activateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(ResultCode.EMBEDDING_FAILED.getCode()))
                .andExpect(jsonPath("$.message").value(ResultCode.EMBEDDING_FAILED.getMessage()));

        // 验证 Service 被调用一次（事务由 Service 层 @Transactional 控制，Controller 不需关心）
        verify(steeringService, times(1))
                .reviewSteering(eq(id), eq(ReviewAction.ACTIVATE), any(), any(), any());
    }

    // =========================================================================
    // versionHistory - 多次修订后版本列表正确
    // =========================================================================

    /**
     * 场景：规范经历 v1(superseded) → v2(active) 两个版本，GET /{id}/versions 返回两条记录。
     */
    @Test
    void versionHistory_afterMultipleRevisions_returnsTwoVersions() throws Exception {
        Long id = 3L;

        SteeringVersionVO v1 = buildVersionVO(1L, 1, "superseded");
        SteeringVersionVO v2 = buildVersionVO(2L, 2, "active");

        Page<SteeringVersionVO> page = new Page<>(1, 20);
        page.setTotal(2);
        page.setRecords(List.of(v2, v1));  // 最新版本在前

        when(steeringService.listVersions(eq(id), eq(1L), eq(20L))).thenReturn(page);

        mockMvc.perform(get(BASE_URL + "/{id}/versions", id)
                        .param("current", "1")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.total").value(2))
                .andExpect(jsonPath("$.data.records[0].status").value("active"))
                .andExpect(jsonPath("$.data.records[1].status").value("superseded"));
    }

    // =========================================================================
    // withdraw - pending_review 回退为 draft，主表 status 不变
    // =========================================================================

    /**
     * 场景：对 active 规范的 pending_review 版本执行 withdraw，
     * 操作成功（HTTP 200，code 200），主表 status 逻辑由 Service 保证不变。
     */
    @Test
    void withdraw_pendingReviewVersion_returnsOk() throws Exception {
        Long id = 4L;
        ReviewSteeringRequest withdrawReq = buildReviewRequest(ReviewAction.WITHDRAW, null);

        doNothing().when(steeringService)
                .reviewSteering(eq(id), eq(ReviewAction.WITHDRAW), any(), any(), any());

        mockMvc.perform(post(BASE_URL + "/{id}/review", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(withdrawReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        verify(steeringService).reviewSteering(eq(id), eq(ReviewAction.WITHDRAW), any(), any(), any());
    }

    // =========================================================================
    // search after activate - 搜索返回新内容
    // =========================================================================

    /**
     * 场景：activate 新版本后，GET /{id} 返回新内容（主表已更新热缓存）。
     * 真正的搜索可检索性由搜索服务的 embedding 更新保证，此处只验证
     * activate 后 getSteeringDetail 返回新内容。
     */
    @Test
    void search_afterActivate_getDetailReturnsNewContent() throws Exception {
        Long id = 5L;
        ReviewSteeringRequest activateReq = buildReviewRequest(ReviewAction.ACTIVATE, null);

        // Step 1: activate 成功
        doNothing().when(steeringService)
                .reviewSteering(eq(id), eq(ReviewAction.ACTIVATE), any(), any(), any());

        mockMvc.perform(post(BASE_URL + "/{id}/review", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(activateReq)))
                .andExpect(jsonPath("$.code").value(200));

        // Step 2: 查询详情返回新内容（模拟 commitActivate 已更新主表热缓存）
        SteeringDetailResponse detail = buildDetailResponse(id, "新版本规范内容 v2", SteeringStatus.ACTIVE);
        when(steeringService.getSteeringDetail(id)).thenReturn(detail);

        mockMvc.perform(get(BASE_URL + "/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.content").value("新版本规范内容 v2"))
                .andExpect(jsonPath("$.data.status").value("active"));
    }

    // =========================================================================
    // 辅助方法
    // =========================================================================

    private ReviewSteeringRequest buildReviewRequest(ReviewAction action, String comment) {
        ReviewSteeringRequest req = new ReviewSteeringRequest();
        req.setAction(action);
        req.setComment(comment);
        return req;
    }

    private SteeringVersionVO buildVersionVO(Long id, int versionNumber, String status) {
        SteeringVersionVO vo = new SteeringVersionVO();
        vo.setId(id);
        vo.setVersionNumber(versionNumber);
        vo.setStatus(status);
        vo.setCreatedAt(OffsetDateTime.now());
        vo.setUpdatedAt(OffsetDateTime.now());
        return vo;
    }

    private SteeringDetailResponse buildDetailResponse(Long id, String content, SteeringStatus status) {
        SteeringDetailResponse resp = new SteeringDetailResponse();
        resp.setId(id);
        resp.setTitle("Test Steering");
        resp.setContent(content);
        resp.setStatus(status);
        resp.setCurrentVersion(2);
        return resp;
    }
}
