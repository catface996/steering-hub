package com.steeringhub.application.api.service;

import com.steeringhub.application.api.dto.request.LoginRequest;

import java.util.List;
import java.util.Map;

/**
 * 登录 + API Key + 停用词管理应用服务
 */
public interface AuthApplicationService {

    Map<String, Object> login(LoginRequest request);

    Map<String, Object> getUserInfo(String token);

    Map<String, Object> createApiKey(String name, Long userId);

    void revokeApiKey(Long keyId);

    List<Map<String, Object>> listApiKeys();

    void toggleApiKey(Long keyId);

    void deleteApiKey(Long keyId);

    List<Map<String, Object>> listStopWords();

    Map<String, Object> createStopWord(String word, String language);

    void deleteStopWord(Long id);

    void toggleStopWord(Long id);
}
