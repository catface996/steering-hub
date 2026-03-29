package com.steeringhub.steering.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.steeringhub.common.response.PageResult;
import com.steeringhub.common.response.Result;
import com.steeringhub.steering.dto.request.CreateSteeringRequest;
import com.steeringhub.steering.dto.request.ReviewSteeringRequest;
import com.steeringhub.steering.dto.request.UpdateSteeringRequest;
import com.steeringhub.steering.dto.response.CompareVO;
import com.steeringhub.steering.dto.response.DiffVO;
import com.steeringhub.steering.dto.response.RepoItem;
import com.steeringhub.steering.dto.response.ReviewQueueItemVO;
import com.steeringhub.steering.dto.response.SpecDetailVO;
import com.steeringhub.steering.dto.response.SteeringDetailResponse;
import com.steeringhub.steering.dto.response.SteeringVersionDetailVO;
import com.steeringhub.steering.dto.response.SteeringVersionVO;
import com.steeringhub.common.exception.BusinessException;
import com.steeringhub.common.response.ResultCode;
import com.steeringhub.steering.entity.Steering;
import com.steeringhub.steering.service.RepoService;
import com.steeringhub.steering.service.SteeringService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@Tag(name = "规范管理")
@RestController
@RequestMapping("/api/v1/web/steerings")
@RequiredArgsConstructor
public class SteeringController {

    private final SteeringService steeringService;
    private final RepoService repoService;

    @Operation(summary = "创建规范")
    @PostMapping
    public Result<SteeringDetailResponse> createSteering(@Valid @RequestBody CreateSteeringRequest request) {
        return Result.ok(steeringService.createSteering(request));
    }

    @Operation(summary = "更新规范")
    @PutMapping("/{id}")
    public Result<SteeringDetailResponse> updateSteering(@PathVariable Long id,
                                                  @Valid @RequestBody UpdateSteeringRequest request) {
        return Result.ok(steeringService.updateSteering(id, request));
    }

    @Operation(summary = "获取规范详情")
    @GetMapping("/{id}")
    public Result<SteeringDetailResponse> getSteering(@PathVariable Long id) {
        return Result.ok(steeringService.getSteeringDetail(id));
    }

    @Operation(summary = "分页查询规范列表")
    @GetMapping
    public Result<IPage<SteeringDetailResponse>> pageSteerings(
            @RequestParam(defaultValue = "1") long current,
            @RequestParam(defaultValue = "20") long size,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword) {
        return Result.ok(steeringService.pageSteerings(new Page<>(current, size), categoryId, status, keyword));
    }

    @Operation(summary = "审核操作（提交/通过/驳回/生效/废弃）")
    @PostMapping("/{id}/review")
    public Result<Void> reviewSteering(@PathVariable Long id,
                                    @Valid @RequestBody ReviewSteeringRequest request) {
        // TODO: 从认证上下文获取 reviewerId/reviewerName
        steeringService.reviewSteering(id, request.getAction(), request.getComment(), null, "system");
        return Result.ok();
    }

    @Operation(summary = "回滚到指定历史版本")
    @PostMapping("/{id}/rollback/{version}")
    public Result<SteeringDetailResponse> rollback(@PathVariable Long id,
                                                @PathVariable int version) {
        return Result.ok(steeringService.rollbackSteering(id, version));
    }

    @Operation(summary = "删除规范")
    @DeleteMapping("/{id}")
    public Result<Void> deleteSteering(@PathVariable Long id) {
        steeringService.deleteSteering(id);
        return Result.ok();
    }

    @Operation(summary = "为规范生成 content_embedding 向量")
    @PostMapping("/{id}/content-embedding")
    public Result<Void> generateContentEmbedding(@PathVariable Long id) {
        steeringService.generateContentEmbedding(id);
        return Result.ok();
    }

    @Operation(summary = "分页查询规范版本历史")
    @GetMapping("/{id}/versions")
    public Result<IPage<SteeringVersionVO>> listVersions(
            @PathVariable Long id,
            @RequestParam(defaultValue = "1") long current,
            @RequestParam(defaultValue = "20") long size) {
        return Result.ok(steeringService.listVersions(id, current, size));
    }

    @Operation(summary = "获取指定版本详情（只读）")
    @GetMapping("/{id}/versions/{versionNumber}")
    public Result<SteeringVersionDetailVO> getVersionDetail(
            @PathVariable Long id,
            @PathVariable int versionNumber) {
        return Result.ok(steeringService.getVersionDetail(id, versionNumber));
    }

    @Operation(summary = "审批队列：查询所有含待审版本的规范")
    @GetMapping("/review-queue")
    public Result<IPage<ReviewQueueItemVO>> listReviewQueue(
            @RequestParam(defaultValue = "1") long current,
            @RequestParam(defaultValue = "20") long size) {
        return Result.ok(steeringService.listReviewQueue(current, size));
    }

    @Operation(summary = "版本对比：当前生效版 vs 待审版")
    @GetMapping("/{id}/diff")
    public Result<DiffVO> getVersionDiff(@PathVariable Long id) {
        return Result.ok(steeringService.getVersionDiff(id));
    }

    @Operation(summary = "左右分屏对比两条规范内容")
    @GetMapping("/compare")
    public Result<CompareVO> compare(@RequestParam Long idA, @RequestParam Long idB) {
        Steering specA = steeringService.getById(idA);
        Steering specB = steeringService.getById(idB);
        if (specA == null || specA.getDeleted()) {
            throw new BusinessException(ResultCode.STEERING_NOT_FOUND);
        }
        if (specB == null || specB.getDeleted()) {
            throw new BusinessException(ResultCode.STEERING_NOT_FOUND);
        }
        CompareVO vo = new CompareVO();
        vo.setSpecA(toSpecDetailVO(specA));
        vo.setSpecB(toSpecDetailVO(specB));
        return Result.ok(vo);
    }

    @Operation(summary = "反向查询：查看某规范被哪些仓库绑定（分页）")
    @GetMapping("/{steeringId}/repos")
    public Result<PageResult<RepoItem>> listReposBySteering(
            @PathVariable Long steeringId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        return Result.ok(repoService.listReposBySteering(steeringId, page, size));
    }

    private SpecDetailVO toSpecDetailVO(Steering s) {
        SpecDetailVO vo = new SpecDetailVO();
        vo.setId(s.getId());
        vo.setTitle(s.getTitle());
        vo.setTags(s.getTags());
        vo.setKeywords(s.getKeywords());
        vo.setContent(s.getContent());
        vo.setStatus(s.getStatus() != null ? s.getStatus().getCode() : null);
        vo.setUpdatedAt(s.getUpdatedAt());
        return vo;
    }
}
