package com.steeringhub.application.impl;

import com.steeringhub.application.api.dto.request.LoginRequest;
import com.steeringhub.application.api.service.AuthApplicationService;
import com.steeringhub.common.exception.BusinessException;
import com.steeringhub.domain.model.auth.ApiKey;
import com.steeringhub.domain.model.auth.SysUser;
import com.steeringhub.domain.model.search.StopWord;
import com.steeringhub.repository.ApiKeyRepository;
import com.steeringhub.repository.StopWordRepository;
import com.steeringhub.repository.SysUserRepository;
import com.steeringhub.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthApplicationServiceImpl implements AuthApplicationService {

    private final SysUserRepository sysUserRepository;
    private final ApiKeyRepository apiKeyRepository;
    private final StopWordRepository stopWordRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> login(LoginRequest request) {
        log.info("login attempt username={}", request.getUsername());

        SysUser user = sysUserRepository.findByUsername(request.getUsername());
        if (user == null) {
            throw new BusinessException("用户不存在");
        }
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BusinessException("密码错误");
        }
        if (!user.getEnabled()) {
            throw new BusinessException("账号已被禁用");
        }

        String token = jwtService.generateToken(user.getId(), user.getUsername(), user.getRole());

        log.info("login success userId={}", user.getId());
        return Map.of(
                "token", token,
                "username", user.getUsername(),
                "nickname", user.getNickname(),
                "role", user.getRole()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getUserInfo(String token) {
        return Map.of(
                "username", jwtService.extractUsername(token),
                "role", jwtService.extractRole(token)
        );
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> createApiKey(String name, Long userId) {
        log.info("createApiKey name={} userId={}", name, userId);

        String keyValue = "sh_" + UUID.randomUUID().toString().replace("-", "");

        ApiKey apiKey = new ApiKey();
        apiKey.setName(name);
        apiKey.setKeyValue(keyValue);
        apiKey.setEnabled(true);
        apiKey.setCreatedBy(String.valueOf(userId));
        apiKeyRepository.save(apiKey);

        return Map.of(
                "id", apiKey.getId(),
                "name", apiKey.getName(),
                "keyValue", apiKey.getKeyValue()
        );
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void revokeApiKey(Long keyId) {
        log.info("revokeApiKey id={}", keyId);
        ApiKey apiKey = apiKeyRepository.getById(keyId);
        if (apiKey != null) {
            apiKey.setEnabled(false);
            apiKeyRepository.update(apiKey);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listApiKeys() {
        return apiKeyRepository.findAllOrderByCreatedAtDesc().stream()
                .map(k -> Map.<String, Object>of(
                        "id", k.getId(),
                        "name", k.getName(),
                        "keyValue", k.getKeyValue(),
                        "enabled", k.getEnabled(),
                        "createdAt", k.getCreatedAt() != null ? k.getCreatedAt().toString() : ""
                ))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void toggleApiKey(Long keyId) {
        log.info("toggleApiKey id={}", keyId);
        ApiKey apiKey = apiKeyRepository.getById(keyId);
        if (apiKey != null) {
            apiKey.setEnabled(!apiKey.getEnabled());
            apiKeyRepository.update(apiKey);
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteApiKey(Long keyId) {
        log.info("deleteApiKey id={}", keyId);
        apiKeyRepository.deleteById(keyId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listStopWords() {
        return stopWordRepository.findAllOrderByWord().stream()
                .map(sw -> Map.<String, Object>of(
                        "id", sw.getId(),
                        "word", sw.getWord(),
                        "language", sw.getLanguage() != null ? sw.getLanguage() : "zh",
                        "enabled", sw.getEnabled()
                ))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> createStopWord(String word, String language) {
        log.info("createStopWord word={}", word);
        StopWord stopWord = new StopWord();
        stopWord.setWord(word.trim().toLowerCase());
        stopWord.setLanguage(language != null ? language : "zh");
        stopWord.setEnabled(true);
        stopWordRepository.save(stopWord);
        return Map.of("id", stopWord.getId(), "word", stopWord.getWord());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteStopWord(Long id) {
        log.info("deleteStopWord id={}", id);
        stopWordRepository.deleteById(id);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void toggleStopWord(Long id) {
        log.info("toggleStopWord id={}", id);
        StopWord stopWord = stopWordRepository.getById(id);
        if (stopWord != null) {
            stopWord.setEnabled(!stopWord.getEnabled());
            stopWordRepository.update(stopWord);
        }
    }
}
