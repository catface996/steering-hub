package com.steeringhub.controller;

import com.steeringhub.application.api.dto.request.LoginRequest;
import com.steeringhub.application.api.service.AuthApplicationService;
import com.steeringhub.common.response.Result;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 认证控制器
 */
@RestController
@RequestMapping("/api/v1/web/auth")
@RequiredArgsConstructor
@Tag(name = "认证管理", description = "用户登录认证相关接口")
public class AuthController {

    private final AuthApplicationService authApplicationService;

    @PostMapping("/login")
    @Operation(summary = "用户登录", description = "使用用户名和密码登录系统")
    public Result<Map<String, Object>> login(@RequestBody @Validated LoginRequest request) {
        return Result.ok(authApplicationService.login(request));
    }

    @GetMapping("/info")
    @Operation(summary = "获取用户信息", description = "根据 Token 获取当前登录用户信息")
    public Result<Map<String, Object>> info(@RequestHeader("Authorization") String auth) {
        String token = auth.replace("Bearer ", "");
        return Result.ok(authApplicationService.getUserInfo(token));
    }
}
