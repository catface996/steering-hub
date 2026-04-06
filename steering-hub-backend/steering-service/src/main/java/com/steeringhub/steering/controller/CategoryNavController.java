package com.steeringhub.steering.controller;

import com.steeringhub.application.api.dto.request.CategoryHierarchyDeleteRequest;
import com.steeringhub.application.api.dto.request.CategoryHierarchyRequest;
import com.steeringhub.application.api.dto.response.CategoryChildCountVO;
import com.steeringhub.application.api.dto.response.CategoryNavItem;
import com.steeringhub.application.api.dto.response.SteeringNavItem;
import com.steeringhub.application.api.service.CategoryApplicationService;
import com.steeringhub.common.response.Result;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@Validated
public class CategoryNavController {

    private final CategoryApplicationService categoryApplicationService;

    @GetMapping("/api/v1/mcp/categories")
    public Result<List<CategoryNavItem>> listCategories(
            @RequestParam(required = false) Long parentId) {
        return Result.ok(categoryApplicationService.listCategories(parentId));
    }

    @GetMapping("/api/v1/mcp/categories/{categoryId}/child-count")
    public Result<CategoryChildCountVO> childCount(@PathVariable Long categoryId) {
        return Result.ok(categoryApplicationService.countDirectChildren(categoryId));
    }

    @GetMapping("/api/v1/mcp/steerings")
    public Result<List<SteeringNavItem>> listSteerings(
            @RequestParam Long categoryId,
            @RequestParam(defaultValue = "10") @Min(1) @Max(50) Integer limit) {
        return Result.ok(categoryApplicationService.listSteerings(categoryId, limit));
    }

    @GetMapping("/api/v1/mcp/categories/{categoryId}/steerings")
    public Result<List<SteeringNavItem>> listSteeringsByCategory(
            @PathVariable Long categoryId,
            @RequestParam(defaultValue = "10") @Min(1) @Max(50) Integer limit) {
        return Result.ok(categoryApplicationService.listSteerings(categoryId, limit));
    }

    @PostMapping("/api/v1/web/category-hierarchy")
    public Result<Void> addHierarchy(@RequestBody @Valid CategoryHierarchyRequest req) {
        categoryApplicationService.addHierarchy(req);
        return Result.ok();
    }

    @PostMapping("/api/v1/web/category-hierarchy/remove")
    public Result<Void> removeHierarchy(@RequestBody @Valid CategoryHierarchyDeleteRequest req) {
        categoryApplicationService.removeHierarchy(req);
        return Result.ok();
    }
}
