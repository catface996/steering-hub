package com.steeringhub.repository;

import com.steeringhub.domain.model.auth.ApiKey;

import java.util.List;

public interface ApiKeyRepository {

    ApiKey findEnabledByKeyValue(String keyValue);

    List<ApiKey> findAllOrderByCreatedAtDesc();

    void save(ApiKey apiKey);

    void update(ApiKey apiKey);

    ApiKey getById(Long id);

    void deleteById(Long id);
}
