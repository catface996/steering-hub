package com.steeringhub.domain.model.compliance;

import lombok.Data;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Data
public class ComplianceReport {

    private Long id;
    private Long repoId;
    private String repoName;
    private String codeSnippet;
    private String taskDescription;
    private BigDecimal score;
    private String violations;
    private String relatedSteerings;
    private String summary;
    private String checkedBy;
    private OffsetDateTime createdAt;
}
