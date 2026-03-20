package com.steeringhub.spec.controller;

import com.steeringhub.common.response.Result;
import com.steeringhub.spec.entity.SpecCategory;
import com.steeringhub.spec.service.SpecCategoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "规范分类管理")
@RestController
@RequestMapping("/api/v1/categories")
@RequiredArgsConstructor
public class SpecCategoryController {

    private final SpecCategoryService specCategoryService;

    @Operation(summary = "获取分类树")
    @GetMapping
    public Result<List<SpecCategory>> listCategories() {
        return Result.ok(specCategoryService.listTree());
    }

    @Operation(summary = "创建分类")
    @PostMapping
    public Result<SpecCategory> createCategory(@RequestParam String name,
                                               @RequestParam String code,
                                               @RequestParam(required = false) String description,
                                               @RequestParam(required = false) Long parentId) {
        return Result.ok(specCategoryService.createCategory(name, code, description, parentId));
    }

    @Operation(summary = "更新分类")
    @PutMapping("/{id}")
    public Result<SpecCategory> updateCategory(@PathVariable Long id,
                                               @RequestParam String name,
                                               @RequestParam(required = false) String description) {
        return Result.ok(specCategoryService.updateCategory(id, name, description));
    }

    @Operation(summary = "删除分类")
    @DeleteMapping("/{id}")
    public Result<Void> deleteCategory(@PathVariable Long id) {
        specCategoryService.deleteCategory(id);
        return Result.ok();
    }
}
