package com.steeringhub.search.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.steeringhub.common.response.PageResult;
import com.steeringhub.search.dto.HitSteeringVO;
import com.steeringhub.search.dto.QueryLogDetailVO;
import com.steeringhub.search.service.SearchAnalyticsService;
import com.steeringhub.steering.entity.Steering;
import com.steeringhub.steering.entity.SteeringQueryLog;
import com.steeringhub.steering.mapper.SteeringMapper;
import com.steeringhub.steering.mapper.SteeringQueryLogMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class SearchAnalyticsServiceImpl implements SearchAnalyticsService {

    private final SteeringQueryLogMapper steeringQueryLogMapper;
    private final SteeringMapper steeringMapper;
    private final ObjectMapper objectMapper;

    @Override
    public Map<String, Object> queryAnalytics(int days) {
        OffsetDateTime since = OffsetDateTime.now().minusDays(days);
        Map<String, Object> analytics = new HashMap<>();

        analytics.put("totalQueries", steeringQueryLogMapper.selectCount(
            new QueryWrapper<SteeringQueryLog>().ge("created_at", since)));

        analytics.put("effectiveQueries", steeringQueryLogMapper.selectCount(
            new QueryWrapper<SteeringQueryLog>().ge("created_at", since).apply("is_effective = true")));

        analytics.put("ineffectiveQueries", steeringQueryLogMapper.selectCount(
            new QueryWrapper<SteeringQueryLog>().ge("created_at", since).apply("is_effective = false")));

        analytics.put("pendingQueries", steeringQueryLogMapper.selectCount(
            new QueryWrapper<SteeringQueryLog>().ge("created_at", since).isNull("is_effective")));

        analytics.put("topQueries", steeringQueryLogMapper.selectMaps(
            new QueryWrapper<SteeringQueryLog>()
                .select("query_text", "COUNT(*) as count")
                .ge("created_at", since)
                .groupBy("query_text")
                .orderByDesc("COUNT(*)")
                .last("LIMIT 10")));

        analytics.put("noResultQueries", steeringQueryLogMapper.selectMaps(
            new QueryWrapper<SteeringQueryLog>()
                .select("query_text", "COUNT(*) as count")
                .ge("created_at", since)
                .eq("result_count", 0)
                .groupBy("query_text")
                .orderByDesc("COUNT(*)")
                .last("LIMIT 10")));

        analytics.put("failureReasons", steeringQueryLogMapper.selectMaps(
            new QueryWrapper<SteeringQueryLog>()
                .select("failure_reason", "COUNT(*) as count")
                .ge("created_at", since)
                .apply("is_effective = false")
                .isNotNull("failure_reason")
                .groupBy("failure_reason")
                .orderByDesc("COUNT(*)")));

        analytics.put("activeAgents", steeringQueryLogMapper.selectMaps(
            new QueryWrapper<SteeringQueryLog>()
                .select("agent_id", "COUNT(*) as count")
                .ge("created_at", since)
                .isNotNull("agent_id")
                .groupBy("agent_id")
                .orderByDesc("COUNT(*)")
                .last("LIMIT 10")));

        analytics.put("dailyStats", steeringQueryLogMapper.selectMaps(
            new QueryWrapper<SteeringQueryLog>()
                .select("DATE(created_at) as date", "COUNT(*) as count")
                .ge("created_at", since)
                .groupBy("DATE(created_at)")
                .orderByAsc("DATE(created_at)")));

        Map<String, Object> avgResponseTime = steeringQueryLogMapper.selectMaps(
            new QueryWrapper<SteeringQueryLog>()
                .select("AVG(response_time_ms) as avg_ms")
                .ge("created_at", since)
                .isNotNull("response_time_ms"))
            .stream().findFirst().orElse(new HashMap<>());
        analytics.put("avgResponseTimeMs", avgResponseTime.get("avg_ms"));

        return analytics;
    }

    @Override
    public PageResult<SteeringQueryLog> getQueryLogs(String query, String startDate, String endDate, int page, int size) {
        var countWrapper = new LambdaQueryWrapper<SteeringQueryLog>();
        applyFilters(countWrapper, query, startDate, endDate);
        long total = steeringQueryLogMapper.selectCount(countWrapper);

        var listWrapper = new LambdaQueryWrapper<SteeringQueryLog>();
        applyFilters(listWrapper, query, startDate, endDate);
        listWrapper.orderByDesc(SteeringQueryLog::getCreatedAt)
                   .last("LIMIT " + size + " OFFSET " + (long)(page - 1) * size);
        List<SteeringQueryLog> records = steeringQueryLogMapper.selectList(listWrapper);

        return PageResult.of(records, total, page, size);
    }

    @Override
    public List<SteeringQueryLog> getFailureLogs(int days, int limit) {
        OffsetDateTime since = OffsetDateTime.now().minusDays(days);
        return steeringQueryLogMapper.selectList(
            new LambdaQueryWrapper<SteeringQueryLog>()
                .eq(SteeringQueryLog::getIsEffective, false)
                .ge(SteeringQueryLog::getCreatedAt, since)
                .orderByDesc(SteeringQueryLog::getCreatedAt)
                .last("LIMIT " + limit));
    }

    @Override
    public QueryLogDetailVO getQueryLogById(Long id) {
        SteeringQueryLog log = steeringQueryLogMapper.selectById(id);
        if (log == null) {
            return null;
        }
        QueryLogDetailVO vo = new QueryLogDetailVO();
        vo.setId(log.getId());
        vo.setQueryText(log.getQueryText());
        vo.setSearchMode(log.getSearchMode());
        vo.setResultCount(log.getResultCount());
        vo.setResultSteeringIds(log.getResultSteeringIds());
        vo.setAgentId(log.getAgentId());
        vo.setSource(log.getSource());
        vo.setRepo(log.getRepo());
        vo.setTaskDescription(log.getTaskDescription());
        vo.setResponseTimeMs(log.getResponseTimeMs());
        vo.setIsEffective(log.getIsEffective());
        vo.setFailureReason(log.getFailureReason());
        vo.setExpectedTopic(log.getExpectedTopic());
        vo.setCreatedAt(log.getCreatedAt());

        List<HitSteeringVO> hitSteerings = new ArrayList<>();
        String idsJson = log.getResultSteeringIds();
        if (idsJson != null && !idsJson.isBlank()) {
            try {
                List<Long> ids = objectMapper.readValue(idsJson, new TypeReference<List<Long>>() {});
                if (!ids.isEmpty()) {
                    List<Steering> steerings = steeringMapper.selectBatchIds(ids);
                    for (Long sid : ids) {
                        steerings.stream()
                            .filter(s -> s.getId().equals(sid))
                            .findFirst()
                            .ifPresent(s -> {
                                HitSteeringVO h = new HitSteeringVO();
                                h.setId(s.getId());
                                h.setTitle(s.getTitle());
                                String c = s.getContent();
                                h.setContentSummary(c != null && c.length() > 200 ? c.substring(0, 200) + "…" : c);
                                h.setStatus(s.getStatus() != null ? s.getStatus().name() : null);
                                h.setCurrentVersion(s.getCurrentVersion());
                                h.setTags(s.getTags());
                                hitSteerings.add(h);
                            });
                    }
                }
            } catch (Exception ignored) {
            }
        }
        vo.setHitSteerings(hitSteerings);
        return vo;
    }

    private void applyFilters(LambdaQueryWrapper<SteeringQueryLog> wrapper,
                               String query, String startDate, String endDate) {
        if (query != null && !query.isBlank()) {
            wrapper.like(SteeringQueryLog::getQueryText, query);
        }
        if (startDate != null && !startDate.isBlank()) {
            wrapper.ge(SteeringQueryLog::getCreatedAt,
                    LocalDate.parse(startDate).atStartOfDay().atOffset(ZoneOffset.UTC));
        }
        if (endDate != null && !endDate.isBlank()) {
            wrapper.le(SteeringQueryLog::getCreatedAt,
                    LocalDate.parse(endDate).plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC));
        }
    }
}
