package com.steeringhub.repository.postgres.po;

import com.baomidou.mybatisplus.annotation.*;
import com.steeringhub.common.enums.ReviewAction;
import lombok.Data;

import java.time.OffsetDateTime;

@Data
@TableName("steering_review")
public class SteeringReviewPO {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long steeringId;

    private Integer steeringVersion;

    private ReviewAction action;

    private String comment;

    private Long reviewerId;

    private String reviewerName;

    @TableField(fill = FieldFill.INSERT)
    private OffsetDateTime createdAt;
}
