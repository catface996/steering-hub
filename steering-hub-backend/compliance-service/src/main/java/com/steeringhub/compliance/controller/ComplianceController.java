package com.steeringhub.compliance.controller;

import com.steeringhub.application.api.dto.request.ComplianceCheckRequest;
import com.steeringhub.application.api.dto.response.ComplianceCheckResponse;
import com.steeringhub.application.api.service.ComplianceApplicationService;
import com.steeringhub.common.response.Result;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "合规审查")
@RestController
@RequestMapping("/api/v1/web/compliance")
@RequiredArgsConstructor
public class ComplianceController {

    private final ComplianceApplicationService complianceApplicationService;

    @Operation(summary = "提交代码合规检查")
    @PostMapping("/check")
    public Result<ComplianceCheckResponse> check(@Valid @RequestBody ComplianceCheckRequest request) {
        return Result.ok(complianceApplicationService.checkCompliance(request));
    }

    @Operation(summary = "获取仓库历史合规报告")
    @GetMapping("/reports")
    public Result<List<ComplianceCheckResponse>> listReports(
            @RequestParam String repoFullName,
            @RequestParam(defaultValue = "20") int limit) {
        return Result.ok(complianceApplicationService.listReports(repoFullName, limit));
    }

    @Operation(summary = "获取合规报告详情")
    @GetMapping("/reports/{reportId}")
    public Result<ComplianceCheckResponse> getReport(@PathVariable Long reportId) {
        return Result.ok(complianceApplicationService.getReport(reportId));
    }
}
