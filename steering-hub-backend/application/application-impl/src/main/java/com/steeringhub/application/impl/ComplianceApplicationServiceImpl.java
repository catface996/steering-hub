package com.steeringhub.application.impl;

import com.steeringhub.application.api.dto.request.ComplianceCheckRequest;
import com.steeringhub.application.api.dto.response.ComplianceCheckResponse;
import com.steeringhub.application.api.dto.response.RelatedSteering;
import com.steeringhub.application.api.dto.response.ViolationDetail;
import com.steeringhub.application.api.service.ComplianceApplicationService;
import com.steeringhub.common.exception.BusinessException;
import com.steeringhub.common.response.ResultCode;
import com.steeringhub.domain.model.compliance.ComplianceReport;
import com.steeringhub.domain.model.repo.Repo;
import com.steeringhub.domain.model.steering.Steering;
import com.steeringhub.embedding.EmbeddingService;
import com.steeringhub.repository.ComplianceReportRepository;
import com.steeringhub.repository.RepoRepository;
import com.steeringhub.repository.SteeringRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ComplianceApplicationServiceImpl implements ComplianceApplicationService {

    private final SteeringRepository steeringRepository;
    private final EmbeddingService embeddingService;
    private final RepoRepository repoRepository;
    private final ComplianceReportRepository complianceReportRepository;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ComplianceCheckResponse checkCompliance(ComplianceCheckRequest request) {
        log.info("checkCompliance start repoFullName={}", request.getRepoFullName());

        Repo repo = repoRepository.findEnabledByFullName(request.getRepoFullName());
        if (repo == null) {
            throw new BusinessException(ResultCode.REPO_NOT_FOUND);
        }

        // Semantic search for relevant steerings
        String snippet = request.getCodeSnippet();
        String queryText = snippet.substring(0, Math.min(500, snippet.length()));
        float[] embedding = embeddingService.embed(queryText);
        List<Steering> relevant = steeringRepository.vectorSearch(embedding, 10, request.getCategoryId());

        List<RelatedSteering> relatedSteerings = relevant.stream().map(s -> {
            RelatedSteering rs = new RelatedSteering();
            rs.setSteeringId(s.getId());
            rs.setSteeringTitle(s.getTitle());
            rs.setSteeringContent(s.getContent());
            rs.setRelevanceScore(s.getSimilarityScore());
            return rs;
        }).collect(Collectors.toList());

        // Placeholder: rule-based violation detection (LLM-based in production)
        List<ViolationDetail> violations = Collections.emptyList();
        BigDecimal score = new BigDecimal("100");
        boolean compliant = true;
        String summary = "代码符合规范要求，合规评分 " + score;

        // Persist report
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
        complianceReportRepository.save(report);

        ComplianceCheckResponse response = new ComplianceCheckResponse();
        response.setReportId(report.getId());
        response.setRepoFullName(request.getRepoFullName());
        response.setScore(score);
        response.setCompliant(compliant);
        response.setSummary(summary);
        response.setViolations(violations);
        response.setRelatedSteerings(relatedSteerings);

        log.info("checkCompliance success reportId={}", report.getId());
        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ComplianceCheckResponse> listReports(String repoFullName, int limit) {
        log.info("listReports repoFullName={} limit={}", repoFullName, limit);

        Repo repo = repoRepository.findEnabledByFullName(repoFullName);
        if (repo == null) {
            return Collections.emptyList();
        }

        return complianceReportRepository.findByRepoId(repo.getId(), limit).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public ComplianceCheckResponse getReport(Long reportId) {
        log.info("getReport reportId={}", reportId);

        ComplianceReport report = complianceReportRepository.getById(reportId);
        if (report == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        return toResponse(report);
    }

    private ComplianceCheckResponse toResponse(ComplianceReport report) {
        ComplianceCheckResponse response = new ComplianceCheckResponse();
        response.setReportId(report.getId());
        response.setRepoFullName(report.getRepoName());
        response.setScore(report.getScore());
        response.setCompliant(report.getScore() != null && report.getScore().compareTo(new BigDecimal("80")) >= 0);
        response.setSummary(report.getSummary());
        try {
            if (report.getViolations() != null) {
                response.setViolations(objectMapper.readValue(report.getViolations(), new TypeReference<>() {}));
            }
            if (report.getRelatedSteerings() != null) {
                response.setRelatedSteerings(objectMapper.readValue(report.getRelatedSteerings(), new TypeReference<>() {}));
            }
        } catch (Exception e) {
            log.warn("Failed to deserialize report details reportId={}", report.getId(), e);
        }
        return response;
    }
}
