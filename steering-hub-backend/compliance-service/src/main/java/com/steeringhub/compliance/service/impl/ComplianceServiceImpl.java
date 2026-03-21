package com.steeringhub.compliance.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.steeringhub.common.exception.BusinessException;
import com.steeringhub.common.response.ResultCode;
import com.steeringhub.compliance.dto.*;
import com.steeringhub.compliance.service.ComplianceService;
import com.steeringhub.search.dto.SearchRequest;
import com.steeringhub.search.dto.SearchResult;
import com.steeringhub.search.service.SearchService;
import com.steeringhub.steering.entity.ComplianceReport;
import com.steeringhub.steering.entity.Repo;
import com.steeringhub.steering.entity.SteeringUsage;
import com.steeringhub.steering.mapper.ComplianceReportMapper;
import com.steeringhub.steering.service.RepoService;
import com.steeringhub.steering.service.SteeringUsageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ComplianceServiceImpl implements ComplianceService {

    private final RepoService repoService;
    private final SteeringUsageService steeringUsageService;
    private final SearchService searchService;
    private final ComplianceReportMapper complianceReportMapper;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional
    public ComplianceCheckResponse checkCompliance(ComplianceCheckRequest request) {
        Repo repo = repoService.getByFullName(request.getRepoFullName());
        if (repo == null) {
            throw new BusinessException(ResultCode.REPO_NOT_FOUND);
        }

        // 1. Semantic search for relevant steerings
        SearchRequest searchRequest = new SearchRequest();
        searchRequest.setQuery(request.getCodeSnippet().substring(0, Math.min(500, request.getCodeSnippet().length())));
        searchRequest.setCategoryId(request.getCategoryId());
        searchRequest.setLimit(10);
        searchRequest.setMode("hybrid");

        List<SearchResult> relevantSteerings = searchService.hybridSearch(searchRequest);

        // 2. Build related steerings list
        List<RelatedSteering> relatedSteerings = relevantSteerings.stream().map(sr -> {
            RelatedSteering rs = new RelatedSteering();
            rs.setSteeringId(sr.getSteeringId());
            rs.setSteeringTitle(sr.getTitle());
            rs.setSteeringContent(sr.getContent());
            rs.setRelevanceScore(sr.getScore());
            return rs;
        }).collect(Collectors.toList());

        // 3. Simple rule-based violation detection (placeholder for LLM-based analysis)
        List<ViolationDetail> violations = detectViolations(request.getCodeSnippet(), relatedSteerings);

        // 4. Calculate score
        BigDecimal score = calculateScore(violations);
        boolean compliant = score.compareTo(new BigDecimal("80")) >= 0;

        String summary = compliant
                ? "代码符合规范要求，合规评分 " + score
                : "发现 " + violations.size() + " 处潜在违规，合规评分 " + score;

        // 5. Persist report
        ComplianceReport report = new ComplianceReport();
        report.setRepoId(repo.getId());
        report.setRepoName(repo.getFullName());
        report.setCodeSnippet(request.getCodeSnippet());
        report.setTaskDescription(request.getTaskDescription());
        report.setScore(score);
        report.setSummary(summary);
        try {
            report.setViolations(objectMapper.writeValueAsString(violations));
            report.setRelatedSteerings(objectMapper.writeValueAsString(relatedSteerings));
        } catch (Exception e) {
            log.warn("Failed to serialize report details", e);
        }
        complianceReportMapper.insert(report);

        ComplianceCheckResponse response = new ComplianceCheckResponse();
        response.setReportId(report.getId());
        response.setRepoFullName(request.getRepoFullName());
        response.setScore(score);
        response.setCompliant(compliant);
        response.setSummary(summary);
        response.setViolations(violations);
        response.setRelatedSteerings(relatedSteerings);
        return response;
    }

    @Override
    public List<ComplianceCheckResponse> listReports(String repoFullName, int limit) {
        Repo repo = repoService.getByFullName(repoFullName);
        if (repo == null) return Collections.emptyList();

        var reports = complianceReportMapper.selectList(
                new LambdaQueryWrapper<ComplianceReport>()
                        .eq(ComplianceReport::getRepoId, repo.getId())
                        .orderByDesc(ComplianceReport::getCreatedAt)
                        .last("LIMIT " + limit)
        );
        return reports.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    public ComplianceCheckResponse getReport(Long reportId) {
        ComplianceReport report = complianceReportMapper.selectById(reportId);
        if (report == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        return toResponse(report);
    }

    private List<ViolationDetail> detectViolations(String codeSnippet, List<RelatedSteering> steerings) {
        // Placeholder: in production, this would call an LLM (Claude via Bedrock) to analyze
        // the code against each steering and return structured violations
        return Collections.emptyList();
    }

    private BigDecimal calculateScore(List<ViolationDetail> violations) {
        if (violations.isEmpty()) return new BigDecimal("100");
        long highCount = violations.stream().filter(v -> "HIGH".equals(v.getSeverity())).count();
        long medCount = violations.stream().filter(v -> "MEDIUM".equals(v.getSeverity())).count();
        long lowCount = violations.stream().filter(v -> "LOW".equals(v.getSeverity())).count();
        double deduction = highCount * 20 + medCount * 10 + lowCount * 5;
        return new BigDecimal(Math.max(0, 100 - deduction));
    }

    private ComplianceCheckResponse toResponse(ComplianceReport report) {
        ComplianceCheckResponse response = new ComplianceCheckResponse();
        response.setReportId(report.getId());
        response.setRepoFullName(report.getRepoName());
        response.setScore(report.getScore());
        response.setCompliant(report.getScore().compareTo(new BigDecimal("80")) >= 0);
        response.setSummary(report.getSummary());
        return response;
    }
}
