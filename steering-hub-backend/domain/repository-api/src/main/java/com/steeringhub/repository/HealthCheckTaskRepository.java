package com.steeringhub.repository;

import com.steeringhub.domain.model.health.HealthCheckTask;

public interface HealthCheckTaskRepository {

    void save(HealthCheckTask task);

    void update(HealthCheckTask task);

    HealthCheckTask findLatestCompleted();

    HealthCheckTask findRunning();
}
