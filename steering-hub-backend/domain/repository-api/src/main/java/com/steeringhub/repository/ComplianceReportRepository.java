package com.steeringhub.repository;

import com.steeringhub.domain.model.compliance.ComplianceReport;

import java.util.List;

public interface ComplianceReportRepository {

    void save(ComplianceReport report);

    ComplianceReport getById(Long id);

    List<ComplianceReport> findByRepoId(Long repoId, int limit);
}
