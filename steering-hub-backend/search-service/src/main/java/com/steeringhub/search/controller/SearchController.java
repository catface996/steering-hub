package com.steeringhub.search.controller;

import com.steeringhub.common.response.Result;
import com.steeringhub.search.dto.SearchRequest;
import com.steeringhub.search.dto.SearchResult;
import com.steeringhub.search.dto.SteeringQualityReport;
import com.steeringhub.search.service.SearchService;
import com.steeringhub.steering.entity.SteeringQueryLog;
import com.steeringhub.steering.mapper.SteeringQueryLogMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Tag(name = "规范检索")
@RestController
@RequestMapping("/api/v1/search")
@RequiredArgsConstructor
public class SearchController {

    private final SearchService searchService;
    private final SteeringQueryLogMapper steeringQueryLogMapper;

    @Operation(summary = "混合检索规范（语义 + 全文）")
    @GetMapping
    public Result<List<SearchResult>> search(@Valid @ModelAttribute SearchRequest request) {
        return switch (request.getMode()) {
            case "semantic" -> Result.ok(searchService.semanticSearch(
                    request.getQuery(), request.getCategoryId(), request.getLimit()));
            case "fulltext" -> Result.ok(searchService.fullTextSearch(
                    request.getQuery(), request.getCategoryId(), request.getLimit()));
            default -> Result.ok(searchService.hybridSearch(request));
        };
    }

    @Operation(summary = "触发规范 Embedding 更新")
    @PostMapping("/embedding/{steeringId}")
    public Result<Void> triggerEmbedding(@PathVariable Long steeringId) {
        searchService.triggerEmbeddingUpdate(steeringId);
        return Result.ok();
    }

    @Operation(summary = "分析规范可检索性质量")
    @GetMapping("/quality/{steeringId}")
    public Result<SteeringQualityReport> analyzeQuality(@PathVariable Long steeringId) {
        return Result.ok(searchService.analyzeSteeringQuality(steeringId));
    }

    @Operation(summary = "批量分析规范质量，返回质量最差的 N 条")
    @GetMapping("/quality/batch")
    public Result<List<SteeringQualityReport>> analyzeBatchQuality(
            @RequestParam(defaultValue = "20") int limit) {
        return Result.ok(searchService.analyzeBatchQuality(limit));
    }

    @Operation(summary = "记录查询日志")
    @PostMapping("/log")
    public Result<Map<String, Object>> logQuery(@RequestBody SteeringQueryLog log) {
        steeringQueryLogMapper.insert(log);
        return Result.ok(java.util.Map.of("id", log.getId()));
    }

    @Operation(summary = "查询分析统计")
    @GetMapping("/analytics/queries")
    public Result<Map<String, Object>> queryAnalytics(
            @RequestParam(defaultValue = "7") int days) {
        OffsetDateTime since = OffsetDateTime.now().minusDays(days);

        // 查询统计数据
        Map<String, Object> analytics = new HashMap<>();

        // 总查询次数
        Long totalQueries = steeringQueryLogMapper.selectCount(
            new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<SteeringQueryLog>()
                .ge("created_at", since)
        );
        analytics.put("totalQueries", totalQueries);

        // 有效/无效/待分析查询数量（直接用 apply 写 SQL 避免 Boolean 映射问题）
        Long effectiveQueries = steeringQueryLogMapper.selectCount(
            new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<SteeringQueryLog>()
                .ge("created_at", since)
                .apply("is_effective = true")
        );
        analytics.put("effectiveQueries", effectiveQueries);

        Long ineffectiveQueries = steeringQueryLogMapper.selectCount(
            new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<SteeringQueryLog>()
                .ge("created_at", since)
                .apply("is_effective = false")
        );
        analytics.put("ineffectiveQueries", ineffectiveQueries);

        Long pendingQueries = steeringQueryLogMapper.selectCount(
            new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<SteeringQueryLog>()
                .ge("created_at", since)
                .isNull("is_effective")
        );
        analytics.put("pendingQueries", pendingQueries);

        // 热门查询词 (Top 10)
        List<Map<String, Object>> topQueries = steeringQueryLogMapper.selectMaps(
            new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<SteeringQueryLog>()
                .select("query_text", "COUNT(*) as count")
                .ge("created_at", since)
                .groupBy("query_text")
                .orderByDesc("COUNT(*)")
                .last("LIMIT 10")
        );
        analytics.put("topQueries", topQueries);

        // 热门无结果查询词 (Top 10)
        List<Map<String, Object>> noResultQueries = steeringQueryLogMapper.selectMaps(
            new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<SteeringQueryLog>()
                .select("query_text", "COUNT(*) as count")
                .ge("created_at", since)
                .eq("result_count", 0)
                .groupBy("query_text")
                .orderByDesc("COUNT(*)")
                .last("LIMIT 10")
        );
        analytics.put("noResultQueries", noResultQueries);

        // 失败原因分布
        List<Map<String, Object>> failureReasons = steeringQueryLogMapper.selectMaps(
            new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<SteeringQueryLog>()
                .select("failure_reason", "COUNT(*) as count")
                .ge("created_at", since)
                .eq("is_effective", false)
                .isNotNull("failure_reason")
                .groupBy("failure_reason")
                .orderByDesc("COUNT(*)")
        );
        analytics.put("failureReasons", failureReasons);

        // 活跃 Agent (Top 10)
        List<Map<String, Object>> activeAgents = steeringQueryLogMapper.selectMaps(
            new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<SteeringQueryLog>()
                .select("agent_id", "COUNT(*) as count")
                .ge("created_at", since)
                .isNotNull("agent_id")
                .groupBy("agent_id")
                .orderByDesc("COUNT(*)")
                .last("LIMIT 10")
        );
        analytics.put("activeAgents", activeAgents);

        // 按天统计
        List<Map<String, Object>> dailyStats = steeringQueryLogMapper.selectMaps(
            new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<SteeringQueryLog>()
                .select("DATE(created_at) as date", "COUNT(*) as count")
                .ge("created_at", since)
                .groupBy("DATE(created_at)")
                .orderByAsc("DATE(created_at)")
        );
        analytics.put("dailyStats", dailyStats);

        // 平均响应时间
        Map<String, Object> avgResponseTime = steeringQueryLogMapper.selectMaps(
            new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<SteeringQueryLog>()
                .select("AVG(response_time_ms) as avg_ms")
                .ge("created_at", since)
                .isNotNull("response_time_ms")
        ).stream().findFirst().orElse(new HashMap<>());
        analytics.put("avgResponseTimeMs", avgResponseTime.get("avg_ms"));

        return Result.ok(analytics);
    }

    @Operation(summary = "获取无效查询记录")
    @GetMapping("/log/failures")
    public Result<List<SteeringQueryLog>> getFailureLogs(
            @RequestParam(defaultValue = "7") int days,
            @RequestParam(defaultValue = "50") int limit) {
        OffsetDateTime since = OffsetDateTime.now().minusDays(days);
        List<SteeringQueryLog> logs = steeringQueryLogMapper.selectList(
            new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<SteeringQueryLog>()
                .eq(SteeringQueryLog::getIsEffective, false)
                .ge(SteeringQueryLog::getCreatedAt, since)
                .orderByDesc(SteeringQueryLog::getCreatedAt)
                .last("LIMIT " + limit)
        );
        return Result.ok(logs);
    }

    @Operation(summary = "上报检索失败")
    @PostMapping("/report-failure")    public Result<Map<String, Object>> reportSearchFailure(@RequestBody Map<String, Object> body) {
        Long logId = Long.valueOf(body.get("logId").toString());
        SteeringQueryLog log = new SteeringQueryLog();
        log.setId(logId);
        log.setIsEffective(false);
        log.setFailureReason((String) body.getOrDefault("reason", "other"));
        log.setExpectedTopic((String) body.getOrDefault("expectedTopic", ""));
        steeringQueryLogMapper.updateById(log);
        return Result.ok(java.util.Map.of("reported", true));
    }

    @Operation(summary = "上报检索成功")
    @PostMapping("/report-success")
    public Result<Map<String, Object>> reportSearchSuccess(@RequestBody Map<String, Object> body) {
        Long logId = Long.valueOf(body.get("logId").toString());
        SteeringQueryLog log = new SteeringQueryLog();
        log.setId(logId);
        log.setIsEffective(true);
        steeringQueryLogMapper.updateById(log);
        return Result.ok(java.util.Map.of("reported", true));
    }
}
