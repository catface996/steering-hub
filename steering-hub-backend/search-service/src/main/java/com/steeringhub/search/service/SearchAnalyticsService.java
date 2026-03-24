package com.steeringhub.search.service;

import com.steeringhub.common.response.PageResult;
import com.steeringhub.search.dto.QueryLogDetailVO;
import com.steeringhub.steering.entity.SteeringQueryLog;

import java.util.List;
import java.util.Map;

public interface SearchAnalyticsService {

    /**
     * 查询分析统计（最近 N 天）
     */
    Map<String, Object> queryAnalytics(int days);

    /**
     * 分页查询检索日志
     */
    PageResult<SteeringQueryLog> getQueryLogs(String query, String startDate, String endDate, int page, int size);

    /**
     * 查询无效检索记录
     */
    List<SteeringQueryLog> getFailureLogs(int days, int limit);

    /**
     * 获取检索日志详情（含命中规范列表）
     */
    QueryLogDetailVO getQueryLogById(Long id);
}
