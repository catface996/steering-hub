package com.steeringhub.repository;

import com.steeringhub.common.response.PageResult;
import com.steeringhub.domain.model.search.SteeringQueryLog;

import java.util.List;
import java.util.Map;

public interface SteeringQueryLogRepository {

    void save(SteeringQueryLog log);

    void update(SteeringQueryLog log);

    int countWeeklySearches();

    SteeringQueryLog getById(Long id);

    PageResult<SteeringQueryLog> page(String query, String startDate, String endDate, int page, int size);

    List<SteeringQueryLog> findFailureLogs(int days, int limit);

    int countByDays(int days);

    int countEffectiveByDays(int days);

    int countIneffectiveByDays(int days);

    int countPendingByDays(int days);

    List<Map<String, Object>> findTopQueriesByDays(int days, int limit);

    List<Map<String, Object>> findActiveAgentsByDays(int days, int limit);

    Double avgResponseTimeByDays(int days);
}
