package com.steeringhub.spec.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.steeringhub.common.response.Result;
import com.steeringhub.spec.dto.request.CreateSpecRequest;
import com.steeringhub.spec.dto.request.ReviewSpecRequest;
import com.steeringhub.spec.dto.request.UpdateSpecRequest;
import com.steeringhub.spec.dto.response.SpecDetailResponse;
import com.steeringhub.spec.entity.Spec;
import com.steeringhub.spec.service.SpecService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@Tag(name = "规范管理")
@RestController
@RequestMapping("/api/v1/specs")
@RequiredArgsConstructor
public class SpecController {

    private final SpecService specService;

    @Operation(summary = "创建规范")
    @PostMapping
    public Result<SpecDetailResponse> createSpec(@Valid @RequestBody CreateSpecRequest request) {
        return Result.ok(specService.createSpec(request));
    }

    @Operation(summary = "更新规范")
    @PutMapping("/{id}")
    public Result<SpecDetailResponse> updateSpec(@PathVariable Long id,
                                                  @Valid @RequestBody UpdateSpecRequest request) {
        return Result.ok(specService.updateSpec(id, request));
    }

    @Operation(summary = "获取规范详情")
    @GetMapping("/{id}")
    public Result<SpecDetailResponse> getSpec(@PathVariable Long id) {
        return Result.ok(specService.getSpecDetail(id));
    }

    @Operation(summary = "分页查询规范列表")
    @GetMapping
    public Result<IPage<SpecDetailResponse>> pageSpecs(
            @RequestParam(defaultValue = "1") long current,
            @RequestParam(defaultValue = "20") long size,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword) {
        return Result.ok(specService.pageSpecs(new Page<>(current, size), categoryId, status, keyword));
    }

    @Operation(summary = "审核操作（提交/通过/驳回/生效/废弃）")
    @PostMapping("/{id}/review")
    public Result<Void> reviewSpec(@PathVariable Long id,
                                    @Valid @RequestBody ReviewSpecRequest request) {
        // TODO: 从认证上下文获取 reviewerId/reviewerName
        specService.reviewSpec(id, request.getAction(), request.getComment(), null, "system");
        return Result.ok();
    }

    @Operation(summary = "回滚到指定历史版本")
    @PostMapping("/{id}/rollback/{version}")
    public Result<SpecDetailResponse> rollback(@PathVariable Long id,
                                                @PathVariable int version) {
        return Result.ok(specService.rollbackSpec(id, version));
    }

    @Operation(summary = "删除规范")
    @DeleteMapping("/{id}")
    public Result<Void> deleteSpec(@PathVariable Long id) {
        specService.deleteSpec(id);
        return Result.ok();
    }
}
