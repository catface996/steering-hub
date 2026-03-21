package com.steeringhub.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.steeringhub.common.response.Result;
import com.steeringhub.spec.entity.ApiKey;
import com.steeringhub.spec.mapper.ApiKeyMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * API Key 管理控制器
 */
@RestController
@RequestMapping("/api/v1/api-keys")
@RequiredArgsConstructor
@Tag(name = "API Key 管理", description = "API Key 创建、查询、启用/禁用、删除")
public class ApiKeyController {

    private final ApiKeyMapper apiKeyMapper;

    /**
     * 创建 API Key
     */
    @PostMapping
    @Operation(summary = "创建 API Key", description = "创建新的 API Key，返回完整 key 值（仅此一次显示）")
    public Result<ApiKey> create(@RequestBody Map<String, String> body) {
        ApiKey apiKey = new ApiKey();
        apiKey.setName(body.get("name"));
        apiKey.setDescription(body.getOrDefault("description", ""));

        // 生成 key：sh_ + 32位随机字符
        String key = "sh_" + UUID.randomUUID().toString().replace("-", "");
        apiKey.setKeyValue(key);
        apiKey.setEnabled(true);

        apiKeyMapper.insert(apiKey);
        return Result.ok(apiKey);
    }

    /**
     * 获取 API Key 列表
     */
    @GetMapping
    @Operation(summary = "获取 API Key 列表", description = "获取所有 API Key（key 值已脱敏）")
    public Result<List<ApiKey>> list() {
        List<ApiKey> keys = apiKeyMapper.selectList(
            new LambdaQueryWrapper<ApiKey>().orderByDesc(ApiKey::getCreatedAt)
        );

        // 脱敏：只显示前10位 + ...
        keys.forEach(k -> {
            if (k.getKeyValue() != null && k.getKeyValue().length() > 10) {
                k.setKeyValue(k.getKeyValue().substring(0, 10) + "...");
            }
        });

        return Result.ok(keys);
    }

    /**
     * 禁用/启用 API Key
     */
    @PutMapping("/{id}/toggle")
    @Operation(summary = "禁用/启用 API Key", description = "切换 API Key 的启用状态")
    public Result<Void> toggle(@PathVariable Long id) {
        ApiKey key = apiKeyMapper.selectById(id);
        if (key != null) {
            key.setEnabled(!key.getEnabled());
            apiKeyMapper.updateById(key);
        }
        return Result.ok();
    }

    /**
     * 删除 API Key
     */
    @DeleteMapping("/{id}")
    @Operation(summary = "删除 API Key", description = "永久删除指定的 API Key")
    public Result<Void> delete(@PathVariable Long id) {
        apiKeyMapper.deleteById(id);
        return Result.ok();
    }
}
