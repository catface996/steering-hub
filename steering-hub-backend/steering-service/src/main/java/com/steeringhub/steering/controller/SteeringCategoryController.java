package com.steeringhub.steering.controller;

import com.steeringhub.common.response.Result;
import com.steeringhub.steering.dto.request.CreateCategoryRequest;
import com.steeringhub.steering.entity.SteeringCategory;
import com.steeringhub.steering.service.SteeringCategoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "规范分类管理")
@RestController
@RequestMapping("/api/v1/web/categories")
@RequiredArgsConstructor
public class SteeringCategoryController {

    private final SteeringCategoryService steeringCategoryService;

    @Operation(summary = "获取分类树")
    @GetMapping
    public Result<List<SteeringCategory>> listCategories() {
        return Result.ok(steeringCategoryService.listTree());
    }

    @Operation(summary = "创建分类")
    @PostMapping
    public Result<SteeringCategory> createCategory(@RequestBody @Valid CreateCategoryRequest req) {
        return Result.ok(steeringCategoryService.createCategory(
                req.getName(), req.getCode(), req.getDescription(), req.getParentId()));
    }

    @Operation(summary = "更新分类")
    @PutMapping("/{id}")
    public Result<SteeringCategory> updateCategory(@PathVariable Long id,
                                               @RequestParam String name,
                                               @RequestParam(required = false) String description) {
        return Result.ok(steeringCategoryService.updateCategory(id, name, description));
    }

    @Operation(summary = "删除分类")
    @DeleteMapping("/{id}")
    public Result<Void> deleteCategory(@PathVariable Long id) {
        steeringCategoryService.deleteCategory(id);
        return Result.ok();
    }
}
