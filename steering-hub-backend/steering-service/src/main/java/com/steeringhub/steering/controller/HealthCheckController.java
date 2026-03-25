package com.steeringhub.steering.controller;

import com.steeringhub.common.response.PageResult;
import com.steeringhub.common.response.Result;
import com.steeringhub.steering.dto.response.HealthCheckTaskVO;
import com.steeringhub.steering.dto.response.SimilarPairVO;
import com.steeringhub.steering.dto.response.TriggerVO;
import com.steeringhub.steering.service.HealthCheckService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Tag(name = "规范健康度")
@RestController
@RequestMapping("/api/v1/health-check")
@RequiredArgsConstructor
public class HealthCheckController {

    private final HealthCheckService healthCheckService;

    @Operation(summary = "触发相似性检测任务")
    @PostMapping("/trigger")
    public Result<TriggerVO> trigger() {
        return Result.ok(healthCheckService.triggerCheck());
    }

    @Operation(summary = "SSE 事件流（任务状态推送）")
    @GetMapping("/events")
    public SseEmitter events() {
        return healthCheckService.subscribeEvents();
    }

    @Operation(summary = "获取最新检测任务状态")
    @GetMapping("/latest")
    public Result<HealthCheckTaskVO> latest() {
        return Result.ok(healthCheckService.getLatestTask().orElse(null));
    }

    @Operation(summary = "标记相似对已处理（删除记录）")
    @PostMapping("/pairs/{pairId}/dismiss")
    public Result<Void> dismissPair(@PathVariable Long pairId) {
        healthCheckService.dismissPair(pairId);
        return Result.ok();
    }

    @Operation(summary = "查询相似规范对列表")
    @GetMapping("/{taskId}/similar-pairs")
    public Result<PageResult<SimilarPairVO>> similarPairs(
            @PathVariable Long taskId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize,
            @RequestParam(required = false) String specTitle,
            @RequestParam(required = false) Long categoryId) {
        return Result.ok(healthCheckService.getSimilarPairs(taskId, page, pageSize, specTitle, categoryId));
    }
}
