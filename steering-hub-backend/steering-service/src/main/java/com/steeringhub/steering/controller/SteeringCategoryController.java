package com.steeringhub.steering.controller;

import com.steeringhub.application.api.dto.request.CreateCategoryRequest;
import com.steeringhub.application.api.dto.response.CategoryVO;
import com.steeringhub.application.api.service.CategoryApplicationService;
import com.steeringhub.common.response.Result;
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

    private final CategoryApplicationService categoryApplicationService;

    @Operation(summary = "获取分类树")
    @GetMapping
    public Result<List<CategoryVO>> listCategories() {
        return Result.ok(categoryApplicationService.listTree());
    }

    @Operation(summary = "创建分类")
    @PostMapping
    public Result<CategoryVO> createCategory(@RequestBody @Valid CreateCategoryRequest req) {
        return Result.ok(categoryApplicationService.createCategory(req));
    }

    @Operation(summary = "更新分类")
    @PutMapping("/{id}")
    public Result<CategoryVO> updateCategory(@PathVariable Long id,
                                             @RequestParam String name,
                                             @RequestParam(required = false) String description) {
        return Result.ok(categoryApplicationService.updateCategory(id, name, description));
    }

    @Operation(summary = "删除分类")
    @DeleteMapping("/{id}")
    public Result<Void> deleteCategory(@PathVariable Long id) {
        categoryApplicationService.deleteCategory(id);
        return Result.ok();
    }
}
