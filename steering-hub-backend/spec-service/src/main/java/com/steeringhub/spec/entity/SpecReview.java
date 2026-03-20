package com.steeringhub.spec.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.steeringhub.common.enums.ReviewAction;
import lombok.Data;

import java.io.Serializable;
import java.time.OffsetDateTime;

@Data
@TableName("spec_review")
public class SpecReview implements Serializable {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long specId;

    private Integer specVersion;

    private ReviewAction action;

    private String comment;

    private Long reviewerId;

    private String reviewerName;

    @TableField(fill = FieldFill.INSERT)
    private OffsetDateTime createdAt;
}
