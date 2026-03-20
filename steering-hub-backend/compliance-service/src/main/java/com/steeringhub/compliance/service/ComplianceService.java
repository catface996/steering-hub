package com.steeringhub.compliance.service;

import com.steeringhub.compliance.dto.ComplianceCheckRequest;
import com.steeringhub.compliance.dto.ComplianceCheckResponse;

import java.util.List;

public interface ComplianceService {

    /**
     * 提交代码片段进行合规检查
     * 流程：
     * 1. 获取该 repo 历史使用过的规范
     * 2. 对代码片段进行语义检索，找到最相关的规范
     * 3. 逐条比对，生成违规报告和评分
     * 4. 保存报告到 DB
     */
    ComplianceCheckResponse checkCompliance(ComplianceCheckRequest request);

    /**
     * 获取某仓库的历史合规报告列表
     */
    List<ComplianceCheckResponse> listReports(String repoFullName, int limit);

    /**
     * 获取报告详情
     */
    ComplianceCheckResponse getReport(Long reportId);
}
