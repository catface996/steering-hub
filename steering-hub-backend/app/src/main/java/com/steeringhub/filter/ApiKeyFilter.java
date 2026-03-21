package com.steeringhub.filter;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.steeringhub.spec.entity.ApiKey;
import com.steeringhub.spec.mapper.ApiKeyMapper;
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

public class ApiKeyFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(ApiKeyFilter.class);
    private final ApiKeyMapper apiKeyMapper;

    public ApiKeyFilter(ApiKeyMapper apiKeyMapper) {
        this.apiKeyMapper = apiKeyMapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain)
            throws ServletException, IOException {

        String apiKeyValue = request.getHeader("X-API-Key");

        if (apiKeyValue != null && apiKeyValue.startsWith("sh_")) {
            ApiKey key = apiKeyMapper.selectOne(
                new LambdaQueryWrapper<ApiKey>()
                    .eq(ApiKey::getKeyValue, apiKeyValue)
                    .eq(ApiKey::getEnabled, true)
            );

            if (key != null) {
                final Long keyId = key.getId();
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

                UsernamePasswordAuthenticationToken auth =
                    new UsernamePasswordAuthenticationToken("api-key-user", null, Collections.emptyList());
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        }

        chain.doFilter(request, response);
    }
}
