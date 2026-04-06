package com.steeringhub.repository.postgres;

import com.steeringhub.domain.model.search.SteeringUsage;
import com.steeringhub.repository.SteeringUsageRepository;
import com.steeringhub.repository.postgres.mapper.SteeringUsagePOMapper;
import com.steeringhub.repository.postgres.po.SteeringUsagePO;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Repository
@RequiredArgsConstructor
public class SteeringUsageRepositoryImpl implements SteeringUsageRepository {

    private final SteeringUsagePOMapper mapper;

    @Override
    public void save(SteeringUsage usage) {
        SteeringUsagePO po = toPO(usage);
        mapper.insert(po);
        usage.setId(po.getId());
    }

    @Override
    public List<SteeringUsage> findByRepoId(Long repoId) {
        return mapper.selectByRepoId(repoId)
                .stream().map(this::toEntity).collect(Collectors.toList());
    }

    @Override
    public List<SteeringUsage> findBySteeringId(Long steeringId) {
        return mapper.selectBySteeringId(steeringId)
                .stream().map(this::toEntity).collect(Collectors.toList());
    }

    @Override
    public List<Map<String, Object>> findUsageStats(int limit) {
        return mapper.selectUsageStats(limit);
    }

    private SteeringUsage toEntity(SteeringUsagePO po) {
        SteeringUsage entity = new SteeringUsage();
        BeanUtils.copyProperties(po, entity);
        return entity;
    }

    private SteeringUsagePO toPO(SteeringUsage entity) {
        SteeringUsagePO po = new SteeringUsagePO();
        BeanUtils.copyProperties(entity, po);
        return po;
    }
}
