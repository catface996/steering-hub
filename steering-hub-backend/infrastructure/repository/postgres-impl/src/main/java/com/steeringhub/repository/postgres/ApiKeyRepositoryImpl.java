package com.steeringhub.repository.postgres;

import com.steeringhub.domain.model.auth.ApiKey;
import com.steeringhub.repository.ApiKeyRepository;
import com.steeringhub.repository.postgres.mapper.ApiKeyPOMapper;
import com.steeringhub.repository.postgres.po.ApiKeyPO;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.stream.Collectors;

@Repository
@RequiredArgsConstructor
public class ApiKeyRepositoryImpl implements ApiKeyRepository {

    private final ApiKeyPOMapper mapper;

    @Override
    public ApiKey findEnabledByKeyValue(String keyValue) {
        ApiKeyPO po = mapper.findEnabledByKeyValue(keyValue);
        return po == null ? null : toEntity(po);
    }

    @Override
    public List<ApiKey> findAllOrderByCreatedAtDesc() {
        return mapper.findAllOrderByCreatedAtDesc()
                .stream().map(this::toEntity).collect(Collectors.toList());
    }

    @Override
    public void save(ApiKey apiKey) {
        ApiKeyPO po = toPO(apiKey);
        mapper.insert(po);
        apiKey.setId(po.getId());
    }

    @Override
    public void update(ApiKey apiKey) {
        mapper.updateById(toPO(apiKey));
    }

    private ApiKey toEntity(ApiKeyPO po) {
        ApiKey entity = new ApiKey();
        BeanUtils.copyProperties(po, entity);
        return entity;
    }

    private ApiKeyPO toPO(ApiKey entity) {
        ApiKeyPO po = new ApiKeyPO();
        BeanUtils.copyProperties(entity, po);
        return po;
    }
}
