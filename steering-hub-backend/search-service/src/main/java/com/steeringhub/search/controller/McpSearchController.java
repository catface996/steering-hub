package com.steeringhub.search.controller;

import com.steeringhub.common.response.Result;
import com.steeringhub.search.dto.SearchRequest;
import com.steeringhub.search.dto.SearchResult;
import com.steeringhub.search.service.SearchService;
import com.steeringhub.steering.entity.SteeringQueryLog;
import com.steeringhub.steering.mapper.SteeringQueryLogMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Tag(name = "MCP 规范检索")
@RestController
@RequestMapping("/api/v1/mcp/search")
@RequiredArgsConstructor
public class McpSearchController {

    private final SearchService searchService;
    private final SteeringQueryLogMapper steeringQueryLogMapper;

    @Operation(summary = "混合检索规范（语义 + 全文），供 MCP 调用，需要 API Key 鉴权")
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

    @Operation(summary = "MCP 客户端上报检索反馈（成功/失败），需要 API Key 鉴权")
    @PostMapping("/feedback")
    public Result<Map<String, Object>> submitFeedback(@RequestBody Map<String, Object> body) {
        Long queryId = Long.valueOf(body.get("queryId").toString());
        String result = (String) body.get("result");

        SteeringQueryLog log = new SteeringQueryLog();
        log.setId(queryId);

        if ("success".equals(result)) {
            log.setIsEffective(true);
        } else if ("failure".equals(result)) {
            log.setIsEffective(false);
            log.setFailureReason((String) body.getOrDefault("reason", "other"));
            log.setExpectedTopic((String) body.getOrDefault("expectedTopic", ""));
        }

        steeringQueryLogMapper.updateById(log);
        return Result.ok(Map.of("reported", true));
    }
}
