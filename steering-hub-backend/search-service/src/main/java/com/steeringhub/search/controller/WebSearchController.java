package com.steeringhub.search.controller;

import com.steeringhub.application.api.dto.request.SearchRequest;
import com.steeringhub.application.api.dto.response.QueryLogDetailVO;
import com.steeringhub.application.api.dto.response.QueryLogVO;
import com.steeringhub.application.api.dto.response.SearchResponse;
import com.steeringhub.application.api.dto.response.SteeringQualityReport;
import com.steeringhub.application.api.service.SearchApplicationService;
import com.steeringhub.common.response.PageResult;
import com.steeringhub.common.response.Result;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Tag(name = "Web 检索管理")
@RestController
@RequestMapping("/api/v1/web/search")
@RequiredArgsConstructor
public class WebSearchController {

    private final SearchApplicationService searchApplicationService;

    @Operation(summary = "混合检索规范（语义 + 全文），供 Web 前端用户调用，使用 JWT 鉴权")
    @GetMapping
    public Result<SearchResponse> search(@Valid @ModelAttribute SearchRequest request) {
        return Result.ok(searchApplicationService.search(request));
    }

    @Operation(summary = "触发规范 Embedding 更新")
    @PostMapping("/embedding/{steeringId}")
    public Result<Void> triggerEmbedding(@PathVariable Long steeringId) {
        searchApplicationService.triggerEmbeddingUpdate(steeringId);
        return Result.ok();
    }

    @Operation(summary = "分析规范可检索性质量")
    @GetMapping("/quality/{steeringId}")
    public Result<SteeringQualityReport> analyzeQuality(@PathVariable Long steeringId) {
        return Result.ok(searchApplicationService.analyzeSteeringQuality(steeringId));
    }

    @Operation(summary = "批量分析规范质量，返回质量最差的 N 条")
    @GetMapping("/quality/batch")
    public Result<List<SteeringQualityReport>> analyzeBatchQuality(
            @RequestParam(defaultValue = "20") int limit) {
        return Result.ok(searchApplicationService.analyzeBatchQuality(limit));
    }

    @Operation(summary = "查询分析统计")
    @GetMapping("/analytics/queries")
    public Result<Map<String, Object>> queryAnalytics(
            @RequestParam(defaultValue = "7") int days) {
        return Result.ok(searchApplicationService.queryAnalytics(days));
    }

    @Operation(summary = "分页查询检索日志")
    @GetMapping("/logs")
    public Result<PageResult<QueryLogVO>> getQueryLogs(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        return Result.ok(searchApplicationService.getQueryLogs(query, startDate, endDate, page, size));
    }

    @Operation(summary = "获取检索日志详情（含命中规范列表）")
    @GetMapping("/logs/{id}")
    public Result<QueryLogDetailVO> getQueryLogById(@PathVariable Long id) {
        QueryLogDetailVO vo = searchApplicationService.getQueryLogById(id);
        if (vo == null) {
            return Result.fail("日志不存在");
        }
        return Result.ok(vo);
    }

    @Operation(summary = "获取无效查询记录")
    @GetMapping("/log/failures")
    public Result<List<QueryLogVO>> getFailureLogs(
            @RequestParam(defaultValue = "7") int days,
            @RequestParam(defaultValue = "50") int limit) {
        return Result.ok(searchApplicationService.getFailureLogs(days, limit));
    }
}
