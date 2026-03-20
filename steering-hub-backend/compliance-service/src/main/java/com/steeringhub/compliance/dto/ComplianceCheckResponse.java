package com.steeringhub.compliance.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class ComplianceCheckResponse {

    private Long reportId;
    private String repoFullName;

    /** 综合合规评分 0-100 */
    private BigDecimal score;

    /** 是否合规（score >= 80 视为合规） */
    private Boolean compliant;

    private String summary;

    private List<ViolationDetail> violations;

    private List<RelatedSpec> relatedSpecs;
}
