package com.steeringhub.filter;

import com.steeringhub.steering.entity.ApiKey;
import com.steeringhub.steering.mapper.ApiKeyMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.List;

public class ApiKeyFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(ApiKeyFilter.class);

    // 需要 API Key 鉴权的路径前缀（所有 MCP 接口）
    // /api/v1/api/** 由前端通过 JWT 访问，不需要 API Key
    private static final String PROTECTED_PATH_PREFIX = "/api/v1/mcp/";

    private final ApiKeyMapper apiKeyMapper;

    public ApiKeyFilter(ApiKeyMapper apiKeyMapper) {
        this.apiKeyMapper = apiKeyMapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain)
            throws ServletException, IOException {

        String path = request.getRequestURI();
        String authHeader = request.getHeader("Authorization");

        // 只有以 /api/v1/mcp/ 开头的路径才要求 API Key
        // /api/v1/api/** 路径由前端用 JWT 访问，不需要 API Key
        boolean requiresApiKey = path.startsWith(PROTECTED_PATH_PREFIX);

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);

            if (token.startsWith("sh_")) {
                // API Key 认证
                ApiKey key = apiKeyMapper.findEnabledByKeyValue(token);

                if (key == null) {
                    if (requiresApiKey) {
                        sendUnauthorized(response, "Invalid or disabled API key");
                        return;
                    }
                } else {
                    // 更新 lastUsedAt（异步）
                    updateLastUsed(key.getId());

                    // 设置认证信息
                    UsernamePasswordAuthenticationToken auth =
                        new UsernamePasswordAuthenticationToken("api-key-user", null, Collections.emptyList());
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
            } else {
                // JWT token，直接放行
                chain.doFilter(request, response);
                return;
            }
        } else if (requiresApiKey) {
            // 保护路径且没有任何认证
            sendUnauthorized(response, "Authorization header required (Bearer <api-key>)");
            return;
        }

        chain.doFilter(request, response);
    }

    private void sendUnauthorized(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write("{\"code\":401,\"message\":\"" + message + "\",\"success\":false}");
    }

    private void updateLastUsed(Long keyId) {
        new Thread(() -> {
            try {
                ApiKey k = new ApiKey();
                k.setId(keyId);
                k.setLastUsedAt(OffsetDateTime.now());
                apiKeyMapper.updateById(k);
            } catch (Exception e) {
                log.warn("Failed to update API key last used time", e);
            }
        }).start();
    }
}
