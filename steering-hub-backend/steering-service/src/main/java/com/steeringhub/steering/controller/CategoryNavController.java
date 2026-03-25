package com.steeringhub.steering.controller;

import com.steeringhub.common.response.Result;
import com.steeringhub.steering.dto.request.CategoryHierarchyDeleteRequest;
import com.steeringhub.steering.dto.request.CategoryHierarchyRequest;
import com.steeringhub.steering.dto.response.CategoryNavItem;
import com.steeringhub.steering.dto.response.SteeringNavItem;
import com.steeringhub.steering.service.CategoryNavService;
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

    private final CategoryNavService categoryNavService;

    @GetMapping("/api/v1/mcp/categories")
    public Result<List<CategoryNavItem>> listCategories(
            @RequestParam(required = false) Long parentId) {
        return Result.ok(categoryNavService.listCategories(parentId));
    }

    @GetMapping("/api/v1/mcp/steerings")
    public Result<List<SteeringNavItem>> listSteerings(
            @RequestParam Long categoryId,
            @RequestParam(defaultValue = "10") @Min(1) @Max(50) Integer limit) {
        return Result.ok(categoryNavService.listSteerings(categoryId, limit));
    }

    @PostMapping("/api/v1/web/category-hierarchy")
    public Result<Void> addHierarchy(
            @RequestBody @Valid CategoryHierarchyRequest req) {
        categoryNavService.addHierarchy(
                req.getParentCategoryId(),
                req.getChildCategoryId(),
                req.getSortOrder());
        return Result.ok();
    }

    @DeleteMapping("/api/v1/web/category-hierarchy")
    public Result<Void> removeHierarchy(
            @RequestBody @Valid CategoryHierarchyDeleteRequest req) {
        categoryNavService.removeHierarchy(
                req.getParentCategoryId(),
                req.getChildCategoryId());
        return Result.ok();
    }
}
