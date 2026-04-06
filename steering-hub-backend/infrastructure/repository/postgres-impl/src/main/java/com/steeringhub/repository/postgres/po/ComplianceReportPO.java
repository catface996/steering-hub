package com.steeringhub.repository.postgres.po;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Data
@TableName("compliance_report")
public class ComplianceReportPO {

    @TableId(type = IdType.AUTO)
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

    @TableField(fill = FieldFill.INSERT)
    private OffsetDateTime createdAt;
}
