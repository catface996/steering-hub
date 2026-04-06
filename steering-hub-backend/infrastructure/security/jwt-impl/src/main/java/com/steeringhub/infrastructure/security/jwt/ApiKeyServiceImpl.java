package com.steeringhub.infrastructure.security.jwt;

import com.steeringhub.security.ApiKeyService;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ApiKeyServiceImpl implements ApiKeyService {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public boolean validate(String apiKey) {
        if (apiKey == null || !apiKey.startsWith("sh_")) {
            return false;
        }
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM api_keys WHERE key_value = ? AND enabled = true",
                Integer.class, apiKey);
        return count != null && count > 0;
    }
}
