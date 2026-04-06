package com.steeringhub.repository;

import com.steeringhub.common.response.PageResult;
import com.steeringhub.domain.model.steering.SteeringVersion;

import java.util.List;

public interface SteeringVersionRepository {

    SteeringVersion getById(Long id);

    List<SteeringVersion> findBySteeringId(Long steeringId);

    SteeringVersion findBySteeringIdAndVersion(Long steeringId, int version);

    Integer findMaxVersionBySteeringId(Long steeringId);

    void save(SteeringVersion version);

    int updateVersionStatus(Long steeringId, String fromStatus, String toStatus);

    SteeringVersion findBySteeringIdAndStatus(Long steeringId, String status);

    PageResult<SteeringVersion> page(Long steeringId, int page, int size);

    int countBySteeringId(Long steeringId);

    List<SteeringVersion> findBySteeringIdIn(List<Long> steeringIds);

    void update(SteeringVersion version);

    void updateStatusByVersion(Long steeringId, Integer versionNumber, String newStatus);
}
