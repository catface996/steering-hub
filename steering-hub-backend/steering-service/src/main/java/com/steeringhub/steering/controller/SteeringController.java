package com.steeringhub.steering.controller;

import com.steeringhub.application.api.dto.request.CreateSteeringRequest;
import com.steeringhub.application.api.dto.request.ReviewSteeringRequest;
import com.steeringhub.application.api.dto.request.UpdateSteeringRequest;
import com.steeringhub.application.api.dto.response.CompareVO;
import com.steeringhub.application.api.dto.response.DiffVO;
import com.steeringhub.application.api.dto.response.RepoItem;
import com.steeringhub.application.api.dto.response.ReviewQueueItemVO;
import com.steeringhub.application.api.dto.response.SteeringDetailResponse;
import com.steeringhub.application.api.dto.response.SteeringVersionDetailVO;
import com.steeringhub.application.api.dto.response.SteeringVersionVO;
import com.steeringhub.application.api.service.RepoApplicationService;
import com.steeringhub.application.api.service.SteeringApplicationService;
import com.steeringhub.common.response.PageResult;
import com.steeringhub.common.response.Result;
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

    private final SteeringApplicationService steeringApplicationService;
    private final RepoApplicationService repoApplicationService;

    @Operation(summary = "创建规范")
    @PostMapping
    public Result<SteeringDetailResponse> createSteering(@Valid @RequestBody CreateSteeringRequest request) {
        return Result.ok(steeringApplicationService.createSteering(request));
    }

    @Operation(summary = "审批队列：查询所有含待审版本的规范")
    @GetMapping("/review-queue")
    public Result<PageResult<ReviewQueueItemVO>> listReviewQueue(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        return Result.ok(steeringApplicationService.listReviewQueue(page, size));
    }

    @Operation(summary = "左右分屏对比两条规范内容")
    @GetMapping("/compare")
    public Result<CompareVO> compare(@RequestParam Long idA, @RequestParam Long idB) {
        return Result.ok(steeringApplicationService.compare(idA, idB));
    }

    @Operation(summary = "更新规范")
    @PutMapping("/{id:\\d+}")
    public Result<SteeringDetailResponse> updateSteering(@PathVariable Long id,
                                                          @Valid @RequestBody UpdateSteeringRequest request) {
        return Result.ok(steeringApplicationService.updateSteering(id, request));
    }

    @Operation(summary = "获取规范详情")
    @GetMapping("/{id:\\d+}")
    public Result<SteeringDetailResponse> getSteering(@PathVariable Long id) {
        return Result.ok(steeringApplicationService.getSteeringDetail(id));
    }

    @Operation(summary = "分页查询规范列表")
    @GetMapping
    public Result<PageResult<SteeringDetailResponse>> pageSteerings(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword) {
        return Result.ok(steeringApplicationService.pageSteerings(page, size, categoryId, status, keyword));
    }

    @Operation(summary = "审核操作（提交/通过/驳回/生效/废弃）")
    @PostMapping("/{id:\\d+}/review")
    public Result<Void> reviewSteering(@PathVariable Long id,
                                        @Valid @RequestBody ReviewSteeringRequest request) {
        // TODO: 从认证上下文获取 reviewerId/reviewerName
        steeringApplicationService.reviewSteering(id, request, null, "system");
        return Result.ok();
    }

    @Operation(summary = "回滚到指定历史版本")
    @PostMapping("/{id:\\d+}/rollback/{version}")
    public Result<SteeringDetailResponse> rollback(@PathVariable Long id,
                                                    @PathVariable int version) {
        return Result.ok(steeringApplicationService.rollbackSteering(id, version));
    }

    @Operation(summary = "删除规范")
    @DeleteMapping("/{id:\\d+}")
    public Result<Void> deleteSteering(@PathVariable Long id) {
        steeringApplicationService.deleteSteering(id);
        return Result.ok();
    }

    @Operation(summary = "为规范生成 content_embedding 向量")
    @PostMapping("/{id:\\d+}/content-embedding")
    public Result<Void> generateContentEmbedding(@PathVariable Long id) {
        steeringApplicationService.generateContentEmbedding(id);
        return Result.ok();
    }

    @Operation(summary = "分页查询规范版本历史")
    @GetMapping("/{id:\\d+}/versions")
    public Result<PageResult<SteeringVersionVO>> listVersions(
            @PathVariable Long id,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        return Result.ok(steeringApplicationService.listVersions(id, page, size));
    }

    @Operation(summary = "获取指定版本详情（只读）")
    @GetMapping("/{id:\\d+}/versions/{versionNumber}")
    public Result<SteeringVersionDetailVO> getVersionDetail(
            @PathVariable Long id,
            @PathVariable int versionNumber) {
        return Result.ok(steeringApplicationService.getVersionDetail(id, versionNumber));
    }

    @Operation(summary = "删除指定草稿版本")
    @DeleteMapping("/{id:\\d+}/versions/{versionNumber}")
    public Result<Void> deleteDraftVersion(@PathVariable Long id,
                                           @PathVariable int versionNumber) {
        steeringApplicationService.deleteDraftVersion(id, versionNumber);
        return Result.ok();
    }

    @Operation(summary = "版本对比：当前生效版 vs 待审版")
    @GetMapping("/{id:\\d+}/diff")
    public Result<DiffVO> getVersionDiff(@PathVariable Long id) {
        return Result.ok(steeringApplicationService.getVersionDiff(id));
    }

    @Operation(summary = "反向查询：查看某规范被哪些仓库绑定（分页）")
    @GetMapping("/{steeringId:\\d+}/repos")
    public Result<PageResult<RepoItem>> listReposBySteering(
            @PathVariable Long steeringId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        return Result.ok(repoApplicationService.listReposBySteering(steeringId, page, size));
    }
}
