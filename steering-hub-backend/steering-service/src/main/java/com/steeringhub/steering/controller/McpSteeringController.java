package com.steeringhub.steering.controller;

import com.steeringhub.application.api.service.SteeringApplicationService;
import com.steeringhub.common.response.Result;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Tag(name = "MCP 规范提交")
@RestController
@RequestMapping("/api/v1/mcp/steerings")
@RequiredArgsConstructor
public class McpSteeringController {

    private final SteeringApplicationService steeringApplicationService;

    @Data
    public static class McpCreateSteeringRequest {
        @NotBlank(message = "规范标题不能为空")
        private String title;

        @NotBlank(message = "规范内容不能为空")
        private String content;

        @NotBlank(message = "规范分类不能为空")
        private String category;

        private List<String> tags;
    }

    @Operation(summary = "MCP 提交新规范（API Key 鉴权，草稿状态）")
    @PostMapping
    public Result<Map<String, Object>> createSteering(@Valid @RequestBody McpCreateSteeringRequest req) {
        return Result.ok(steeringApplicationService.mcpCreateSteering(
                req.getTitle(), req.getContent(), req.getCategory(), req.getTags()));
    }

    @Data
    public static class McpReviseSteeringRequest {
        @NotBlank(message = "规范内容不能为空")
        private String content;

        @NotBlank(message = "修改说明不能为空")
        private String changeLog;

        private List<String> tags;
    }

    @Operation(summary = "MCP 提交规范修订（对已有规范提交优化版本，自动进入审核）")
    @PutMapping("/{id}")
    public Result<Map<String, Object>> reviseSteering(@PathVariable Long id,
                                                       @Valid @RequestBody McpReviseSteeringRequest req) {
        return Result.ok(steeringApplicationService.mcpReviseSteering(
                id, req.getContent(), req.getChangeLog(), req.getTags()));
    }
}
