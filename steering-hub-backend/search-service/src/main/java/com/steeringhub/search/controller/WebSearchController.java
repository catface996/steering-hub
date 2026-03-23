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

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import com.steeringhub.common.response.PageResult;

@Tag(name = "Web 检索管理")
@RestController
@RequestMapping("/api/v1/web/search")
@RequiredArgsConstructor
public class WebSearchController {

    private final SearchService searchService;
    private final SteeringQueryLogMapper steeringQueryLogMapper;

    @Operation(summary = "混合检索规范（语义 + 全文），供 Web 前端用户调用，使用 JWT 鉴权")
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

    @Operation(summary = "查询分析统计")
    @GetMapping("/analytics/queries")
    public Result<Map<String, Object>> queryAnalytics(
            @RequestParam(defaultValue = "7") int days) {
        OffsetDateTime since = OffsetDateTime.now().minusDays(days);

        Map<String, Object> analytics = new HashMap<>();

        Long totalQueries = steeringQueryLogMapper.selectCount(
            new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<SteeringQueryLog>()
                .ge("created_at", since)
        );
        analytics.put("totalQueries", totalQueries);

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

        List<Map<String, Object>> topQueries = steeringQueryLogMapper.selectMaps(
            new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<SteeringQueryLog>()
                .select("query_text", "COUNT(*) as count")
                .ge("created_at", since)
                .groupBy("query_text")
                .orderByDesc("COUNT(*)")
                .last("LIMIT 10")
        );
        analytics.put("topQueries", topQueries);

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

        List<Map<String, Object>> failureReasons = steeringQueryLogMapper.selectMaps(
            new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<SteeringQueryLog>()
                .select("failure_reason", "COUNT(*) as count")
                .ge("created_at", since)
                .apply("is_effective = false")
                .isNotNull("failure_reason")
                .groupBy("failure_reason")
                .orderByDesc("COUNT(*)")
        );
        analytics.put("failureReasons", failureReasons);

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

        List<Map<String, Object>> dailyStats = steeringQueryLogMapper.selectMaps(
            new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<SteeringQueryLog>()
                .select("DATE(created_at) as date", "COUNT(*) as count")
                .ge("created_at", since)
                .groupBy("DATE(created_at)")
                .orderByAsc("DATE(created_at)")
        );
        analytics.put("dailyStats", dailyStats);

        Map<String, Object> avgResponseTime = steeringQueryLogMapper.selectMaps(
            new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<SteeringQueryLog>()
                .select("AVG(response_time_ms) as avg_ms")
                .ge("created_at", since)
                .isNotNull("response_time_ms")
        ).stream().findFirst().orElse(new HashMap<>());
        analytics.put("avgResponseTimeMs", avgResponseTime.get("avg_ms"));

        return Result.ok(analytics);
    }

    @Operation(summary = "分页查询检索日志")
    @GetMapping("/logs")
    public Result<PageResult<SteeringQueryLog>> getQueryLogs(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        var countWrapper = new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<SteeringQueryLog>();
        if (query != null && !query.isBlank()) {
            countWrapper.like(SteeringQueryLog::getQueryText, query);
        }
        if (startDate != null && !startDate.isBlank()) {
            countWrapper.ge(SteeringQueryLog::getCreatedAt,
                    LocalDate.parse(startDate).atStartOfDay().atOffset(ZoneOffset.UTC));
        }
        if (endDate != null && !endDate.isBlank()) {
            countWrapper.le(SteeringQueryLog::getCreatedAt,
                    LocalDate.parse(endDate).plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC));
        }
        long total = steeringQueryLogMapper.selectCount(countWrapper);

        var listWrapper = new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<SteeringQueryLog>();
        if (query != null && !query.isBlank()) {
            listWrapper.like(SteeringQueryLog::getQueryText, query);
        }
        if (startDate != null && !startDate.isBlank()) {
            listWrapper.ge(SteeringQueryLog::getCreatedAt,
                    LocalDate.parse(startDate).atStartOfDay().atOffset(ZoneOffset.UTC));
        }
        if (endDate != null && !endDate.isBlank()) {
            listWrapper.le(SteeringQueryLog::getCreatedAt,
                    LocalDate.parse(endDate).plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC));
        }
        listWrapper.orderByDesc(SteeringQueryLog::getCreatedAt)
                   .last("LIMIT " + size + " OFFSET " + (long)(page - 1) * size);
        List<SteeringQueryLog> records = steeringQueryLogMapper.selectList(listWrapper);
        return Result.ok(PageResult.of(records, total, page, size));
    }

    @Operation(summary = "获取检索日志详情")
    @GetMapping("/logs/{id}")
    public Result<SteeringQueryLog> getQueryLogById(@PathVariable Long id) {
        SteeringQueryLog log = steeringQueryLogMapper.selectById(id);
        if (log == null) {
            return Result.fail("日志不存在");
        }
        return Result.ok(log);
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
}
