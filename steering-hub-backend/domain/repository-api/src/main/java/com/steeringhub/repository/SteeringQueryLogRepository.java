package com.steeringhub.repository;

import com.steeringhub.domain.model.search.SteeringQueryLog;

public interface SteeringQueryLogRepository {

    void save(SteeringQueryLog log);

    int countWeeklySearches();
}
