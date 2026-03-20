package com.steeringhub.spec.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Data
@TableName("compliance_report")
public class ComplianceReport implements Serializable {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long repoId;

    private String repoName;

    private String codeSnippet;

    private String taskDescription;

    /** 合规评分 0-100 */
    private BigDecimal score;

    /** JSON 格式的违规详情列表 */
    private String violations;

    /** JSON 格式的相关规范列表 */
    private String relatedSpecs;

    private String summary;

    private String checkedBy;

    @TableField(fill = FieldFill.INSERT)
    private OffsetDateTime createdAt;
}
