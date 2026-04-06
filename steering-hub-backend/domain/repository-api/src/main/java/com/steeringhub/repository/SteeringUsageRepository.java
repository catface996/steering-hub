package com.steeringhub.repository;

import com.steeringhub.domain.model.search.SteeringUsage;

import java.util.List;
import java.util.Map;

public interface SteeringUsageRepository {

    void save(SteeringUsage usage);

    List<SteeringUsage> findByRepoId(Long repoId);

    List<SteeringUsage> findBySteeringId(Long steeringId);

    List<Map<String, Object>> findUsageStats(int limit);
}
