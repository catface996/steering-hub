package com.steeringhub.application.api.service;

import com.steeringhub.application.api.dto.request.SearchRequest;
import com.steeringhub.application.api.dto.response.DashboardStatsVO;
import com.steeringhub.application.api.dto.response.QueryLogDetailVO;
import com.steeringhub.application.api.dto.response.QueryLogVO;
import com.steeringhub.application.api.dto.response.SearchResponse;
import com.steeringhub.application.api.dto.response.SteeringQualityReport;
import com.steeringhub.common.response.PageResult;

import java.util.List;
import java.util.Map;

/**
 * MCP 搜索 + 检索日志应用服务
 */
public interface SearchApplicationService {

    SearchResponse search(SearchRequest request);

    SteeringQualityReport analyzeSteeringQuality(Long steeringId);

    List<SteeringQualityReport> analyzeBatchQuality(int limit);

    DashboardStatsVO getDashboardStats();

    Map<String, Object> queryAnalytics(int days);

    PageResult<QueryLogVO> getQueryLogs(String query, String startDate, String endDate, int page, int size);

    List<QueryLogVO> getFailureLogs(int days, int limit);

    QueryLogDetailVO getQueryLogById(Long id);

    void submitFeedback(Long queryId, String result, String reason, String expectedTopic);

    void triggerEmbeddingUpdate(Long steeringId);
}
