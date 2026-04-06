package com.steeringhub.application.api.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class ComplianceCheckResponse {

    private Long reportId;
    private String repoFullName;
    private BigDecimal score;
    private Boolean compliant;
    private String summary;
    private List<ViolationDetail> violations;
    private List<RelatedSteering> relatedSteerings;
}
