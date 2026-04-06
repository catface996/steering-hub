package com.steeringhub.application.api.service;

import com.steeringhub.application.api.dto.request.ComplianceCheckRequest;
import com.steeringhub.application.api.dto.response.ComplianceCheckResponse;

import java.util.List;

/**
 * 合规检测应用服务
 */
public interface ComplianceApplicationService {

    ComplianceCheckResponse checkCompliance(ComplianceCheckRequest request);

    List<ComplianceCheckResponse> listReports(String repoFullName, int limit);

    ComplianceCheckResponse getReport(Long reportId);
}
