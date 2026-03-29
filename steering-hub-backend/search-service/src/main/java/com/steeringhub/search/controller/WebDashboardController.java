package com.steeringhub.search.controller;

import com.steeringhub.common.response.Result;
import com.steeringhub.search.dto.DashboardStatsVO;
import com.steeringhub.search.service.SearchAnalyticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Web Dashboard 统计")
@RestController
@RequestMapping("/api/v1/web/dashboard")
@RequiredArgsConstructor
public class WebDashboardController {

    private final SearchAnalyticsService searchAnalyticsService;

    @Operation(summary = "获取 Dashboard 统计数据（本周检索次数、已生效规范数）")
    @GetMapping("/stats")
    public Result<DashboardStatsVO> getStats() {
        return Result.ok(searchAnalyticsService.getDashboardStats());
    }
}
