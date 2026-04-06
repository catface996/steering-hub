package com.steeringhub.repository.postgres;

import com.steeringhub.domain.model.health.HealthCheckTask;
import com.steeringhub.repository.HealthCheckTaskRepository;
import com.steeringhub.repository.postgres.mapper.HealthCheckTaskPOMapper;
import com.steeringhub.repository.postgres.po.HealthCheckTaskPO;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class HealthCheckTaskRepositoryImpl implements HealthCheckTaskRepository {

    private final HealthCheckTaskPOMapper mapper;

    @Override
    public void save(HealthCheckTask task) {
        HealthCheckTaskPO po = toPO(task);
        mapper.insert(po);
        task.setId(po.getId());
    }

    @Override
    public void update(HealthCheckTask task) {
        mapper.updateById(toPO(task));
    }

    @Override
    public HealthCheckTask findLatestCompleted() {
        HealthCheckTaskPO po = mapper.findLatestCompleted();
        return po == null ? null : toEntity(po);
    }

    @Override
    public HealthCheckTask findRunning() {
        HealthCheckTaskPO po = mapper.findRunning();
        return po == null ? null : toEntity(po);
    }

    private HealthCheckTask toEntity(HealthCheckTaskPO po) {
        HealthCheckTask entity = new HealthCheckTask();
        BeanUtils.copyProperties(po, entity);
        return entity;
    }

    private HealthCheckTaskPO toPO(HealthCheckTask entity) {
        HealthCheckTaskPO po = new HealthCheckTaskPO();
        BeanUtils.copyProperties(entity, po);
        return po;
    }
}
