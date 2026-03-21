package com.steeringhub.search.controller;

import com.steeringhub.common.response.Result;
import com.steeringhub.search.dto.SearchRequest;
import com.steeringhub.search.dto.SearchResult;
import com.steeringhub.search.dto.SpecQualityReport;
import com.steeringhub.search.service.SearchService;
import com.steeringhub.spec.entity.SpecQueryLog;
import com.steeringhub.spec.mapper.SpecQueryLogMapper;
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
    private final SpecQueryLogMapper specQueryLogMapper;

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
    @PostMapping("/embedding/{specId}")
    public Result<Void> triggerEmbedding(@PathVariable Long specId) {
        searchService.triggerEmbeddingUpdate(specId);
        return Result.ok();
    }

    @Operation(summary = "分析规范可检索性质量")
    @GetMapping("/quality/{specId}")
    public Result<SpecQualityReport> analyzeQuality(@PathVariable Long specId) {
        return Result.ok(searchService.analyzeSpecQuality(specId));
    }

    @Operation(summary = "批量分析规范质量，返回质量最差的 N 条")
    @GetMapping("/quality/batch")
    public Result<List<SpecQualityReport>> analyzeBatchQuality(
            @RequestParam(defaultValue = "20") int limit) {
        return Result.ok(searchService.analyzeBatchQuality(limit));
    }

    @Operation(summary = "记录查询日志")
    @PostMapping("/log")
    public Result<Void> logQuery(@RequestBody SpecQueryLog log) {
        specQueryLogMapper.insert(log);
        return Result.ok();
    }

    @Operation(summary = "查询分析统计")
    @GetMapping("/analytics/queries")
    public Result<Map<String, Object>> queryAnalytics(
            @RequestParam(defaultValue = "7") int days) {
        OffsetDateTime since = OffsetDateTime.now().minusDays(days);

        // 查询统计数据
        Map<String, Object> analytics = new HashMap<>();

        // 总查询次数
        Long totalQueries = specQueryLogMapper.selectCount(
            new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<SpecQueryLog>()
                .ge("created_at", since)
        );
        analytics.put("totalQueries", totalQueries);

        // 热门查询词 (Top 10)
        List<Map<String, Object>> topQueries = specQueryLogMapper.selectMaps(
            new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<SpecQueryLog>()
                .select("query_text", "COUNT(*) as count")
                .ge("created_at", since)
                .groupBy("query_text")
                .orderByDesc("COUNT(*)")
                .last("LIMIT 10")
        );
        analytics.put("topQueries", topQueries);

        // 活跃 Agent (Top 10)
        List<Map<String, Object>> activeAgents = specQueryLogMapper.selectMaps(
            new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<SpecQueryLog>()
                .select("agent_id", "COUNT(*) as count")
                .ge("created_at", since)
                .isNotNull("agent_id")
                .groupBy("agent_id")
                .orderByDesc("COUNT(*)")
                .last("LIMIT 10")
        );
        analytics.put("activeAgents", activeAgents);

        // 按天统计
        List<Map<String, Object>> dailyStats = specQueryLogMapper.selectMaps(
            new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<SpecQueryLog>()
                .select("DATE(created_at) as date", "COUNT(*) as count")
                .ge("created_at", since)
                .groupBy("DATE(created_at)")
                .orderByAsc("DATE(created_at)")
        );
        analytics.put("dailyStats", dailyStats);

        // 平均响应时间
        Map<String, Object> avgResponseTime = specQueryLogMapper.selectMaps(
            new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<SpecQueryLog>()
                .select("AVG(response_time_ms) as avg_ms")
                .ge("created_at", since)
                .isNotNull("response_time_ms")
        ).stream().findFirst().orElse(new HashMap<>());
        analytics.put("avgResponseTimeMs", avgResponseTime.get("avg_ms"));

        return Result.ok(analytics);
    }
}
