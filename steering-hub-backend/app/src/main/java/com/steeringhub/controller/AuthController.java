package com.steeringhub.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.steeringhub.common.dto.LoginDTO;
import com.steeringhub.common.exception.BusinessException;
import com.steeringhub.common.response.Result;
import com.steeringhub.common.utils.JwtUtils;
import com.steeringhub.spec.entity.SysUser;
import com.steeringhub.spec.mapper.SysUserMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 认证控制器
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "认证管理", description = "用户登录认证相关接口")
public class AuthController {

    private final SysUserMapper userMapper;
    private final JwtUtils jwtUtils;
    private final PasswordEncoder passwordEncoder;

    /**
     * 用户登录
     */
    @PostMapping("/login")
    @Operation(summary = "用户登录", description = "使用用户名和密码登录系统")
    public Result<Map<String, Object>> login(@RequestBody @Validated LoginDTO dto) {
        // 查询用户
        SysUser user = userMapper.selectOne(
                new LambdaQueryWrapper<SysUser>().eq(SysUser::getUsername, dto.getUsername())
        );

        // 验证用户名
        if (user == null) {
            throw new BusinessException("用户不存在");
        }

        // 验证密码
        if (!passwordEncoder.matches(dto.getPassword(), user.getPassword())) {
            throw new BusinessException("密码错误");
        }

        // 验证账号状态
        if (!user.getEnabled()) {
            throw new BusinessException("账号已被禁用");
        }

        // 生成 Token
        String token = jwtUtils.generateToken(user.getId(), user.getUsername(), user.getRole());

        // 返回登录信息
        Map<String, Object> data = Map.of(
                "token", token,
                "username", user.getUsername(),
                "nickname", user.getNickname(),
                "role", user.getRole()
        );

        return Result.ok(data);
    }

    /**
     * 获取当前用户信息
     */
    @GetMapping("/info")
    @Operation(summary = "获取用户信息", description = "根据 Token 获取当前登录用户信息")
    public Result<Map<String, Object>> info(@RequestHeader("Authorization") String auth) {
        // 解析 Token
        String token = auth.replace("Bearer ", "");
        var claims = jwtUtils.parseToken(token);

        // 返回用户信息
        return Result.ok(Map.of(
                "username", claims.get("username"),
                "role", claims.get("role")
        ));
    }
}
