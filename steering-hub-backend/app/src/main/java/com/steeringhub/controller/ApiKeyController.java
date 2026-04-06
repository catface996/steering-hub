package com.steeringhub.controller;

import com.steeringhub.application.api.service.AuthApplicationService;
import com.steeringhub.common.response.Result;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * API Key 管理控制器
 */
@RestController
@RequestMapping("/api/v1/web/api-keys")
@RequiredArgsConstructor
@Tag(name = "API Key 管理", description = "API Key 创建、查询、启用/禁用、删除")
public class ApiKeyController {

    private final AuthApplicationService authApplicationService;

    @PostMapping
    @Operation(summary = "创建 API Key", description = "创建新的 API Key，返回完整 key 值（仅此一次显示）")
    public Result<Map<String, Object>> create(@RequestBody Map<String, String> body) {
        return Result.ok(authApplicationService.createApiKey(body.get("name"), null));
    }

    @GetMapping
    @Operation(summary = "获取 API Key 列表", description = "获取所有 API Key")
    public Result<List<Map<String, Object>>> list() {
        return Result.ok(authApplicationService.listApiKeys());
    }

    @PutMapping("/{id}/toggle")
    @Operation(summary = "禁用/启用 API Key", description = "切换 API Key 的启用状态")
    public Result<Void> toggle(@PathVariable Long id) {
        authApplicationService.toggleApiKey(id);
        return Result.ok();
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除 API Key", description = "永久删除指定的 API Key")
    public Result<Void> delete(@PathVariable Long id) {
        authApplicationService.deleteApiKey(id);
        return Result.ok();
    }
}
