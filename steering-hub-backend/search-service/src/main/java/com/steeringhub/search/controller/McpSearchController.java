package com.steeringhub.search.controller;

import com.steeringhub.application.api.dto.request.SearchRequest;
import com.steeringhub.application.api.dto.response.SearchResponse;
import com.steeringhub.application.api.service.SearchApplicationService;
import com.steeringhub.common.response.Result;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@Tag(name = "MCP 规范检索")
@RestController
@RequestMapping("/api/v1/mcp/search")
@RequiredArgsConstructor
public class McpSearchController {

    private final SearchApplicationService searchApplicationService;

    @Operation(summary = "混合检索规范（语义 + 全文），供 MCP 调用，需要 API Key 鉴权")
    @GetMapping
    public Result<SearchResponse> search(@Valid @ModelAttribute SearchRequest request) {
        return Result.ok(searchApplicationService.search(request));
    }

    @Operation(summary = "MCP 客户端上报检索反馈（成功/失败），需要 API Key 鉴权")
    @PostMapping("/feedback")
    public Result<Map<String, Object>> submitFeedback(@RequestBody Map<String, Object> body) {
        Long queryId = Long.valueOf(body.get("queryId").toString());
        String result = (String) body.get("result");
        String reason = (String) body.getOrDefault("reason", "other");
        String expectedTopic = (String) body.getOrDefault("expectedTopic", "");

        searchApplicationService.submitFeedback(queryId, result, reason, expectedTopic);
        return Result.ok(Map.of("reported", true));
    }
}
