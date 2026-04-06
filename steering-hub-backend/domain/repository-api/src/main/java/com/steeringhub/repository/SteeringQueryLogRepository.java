package com.steeringhub.repository;

import com.steeringhub.common.response.PageResult;
import com.steeringhub.domain.model.search.SteeringQueryLog;

import java.util.List;

public interface SteeringQueryLogRepository {

    void save(SteeringQueryLog log);

    int countWeeklySearches();

    SteeringQueryLog getById(Long id);

    PageResult<SteeringQueryLog> page(String query, String startDate, String endDate, int page, int size);

    List<SteeringQueryLog> findFailureLogs(int days, int limit);
}
