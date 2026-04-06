package com.steeringhub.repository.postgres;

import com.steeringhub.domain.model.compliance.ComplianceReport;
import com.steeringhub.repository.ComplianceReportRepository;
import com.steeringhub.repository.postgres.mapper.ComplianceReportPOMapper;
import com.steeringhub.repository.postgres.po.ComplianceReportPO;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.stream.Collectors;

@Repository
@RequiredArgsConstructor
public class ComplianceReportRepositoryImpl implements ComplianceReportRepository {

    private final ComplianceReportPOMapper mapper;

    @Override
    public void save(ComplianceReport report) {
        ComplianceReportPO po = toPO(report);
        mapper.insert(po);
        report.setId(po.getId());
    }

    @Override
    public ComplianceReport getById(Long id) {
        ComplianceReportPO po = mapper.selectById(id);
        return po != null ? toDomain(po) : null;
    }

    @Override
    public List<ComplianceReport> findByRepoId(Long repoId, int limit) {
        return mapper.findByRepoId(repoId, limit).stream()
                .map(this::toDomain)
                .collect(Collectors.toList());
    }

    private ComplianceReportPO toPO(ComplianceReport entity) {
        ComplianceReportPO po = new ComplianceReportPO();
        BeanUtils.copyProperties(entity, po);
        return po;
    }

    private ComplianceReport toDomain(ComplianceReportPO po) {
        ComplianceReport entity = new ComplianceReport();
        BeanUtils.copyProperties(po, entity);
        return entity;
    }
}
