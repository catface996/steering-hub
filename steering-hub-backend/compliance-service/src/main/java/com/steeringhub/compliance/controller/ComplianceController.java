package com.steeringhub.compliance.controller;

import com.steeringhub.common.response.Result;
import com.steeringhub.compliance.dto.ComplianceCheckRequest;
import com.steeringhub.compliance.dto.ComplianceCheckResponse;
import com.steeringhub.compliance.service.ComplianceService;
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

    private final ComplianceService complianceService;

    @Operation(summary = "提交代码合规检查")
    @PostMapping("/check")
    public Result<ComplianceCheckResponse> check(@Valid @RequestBody ComplianceCheckRequest request) {
        return Result.ok(complianceService.checkCompliance(request));
    }

    @Operation(summary = "获取仓库历史合规报告")
    @GetMapping("/reports")
    public Result<List<ComplianceCheckResponse>> listReports(
            @RequestParam String repoFullName,
            @RequestParam(defaultValue = "20") int limit) {
        return Result.ok(complianceService.listReports(repoFullName, limit));
    }

    @Operation(summary = "获取合规报告详情")
    @GetMapping("/reports/{reportId}")
    public Result<ComplianceCheckResponse> getReport(@PathVariable Long reportId) {
        return Result.ok(complianceService.getReport(reportId));
    }
}
