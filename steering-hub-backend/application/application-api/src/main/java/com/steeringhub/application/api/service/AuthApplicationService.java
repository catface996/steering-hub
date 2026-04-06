package com.steeringhub.application.api.service;

import com.steeringhub.application.api.dto.request.LoginRequest;

import java.util.Map;

/**
 * 登录 + API Key 管理应用服务
 */
public interface AuthApplicationService {

    Map<String, Object> login(LoginRequest request);

    Map<String, Object> getUserInfo(String token);

    Map<String, Object> createApiKey(String name, Long userId);

    void revokeApiKey(Long keyId);
}
