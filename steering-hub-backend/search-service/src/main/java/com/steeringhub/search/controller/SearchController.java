package com.steeringhub.search.controller;

import com.steeringhub.common.response.Result;
import com.steeringhub.search.dto.SearchRequest;
import com.steeringhub.search.dto.SearchResult;
import com.steeringhub.search.dto.SpecQualityReport;
import com.steeringhub.search.service.SearchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "规范检索")
@RestController
@RequestMapping("/api/v1/search")
@RequiredArgsConstructor
public class SearchController {

    private final SearchService searchService;

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
}
