package com.steeringhub.steering.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.steeringhub.common.enums.ReviewAction;
import lombok.Data;

import java.io.Serializable;
import java.time.OffsetDateTime;

@Data
@TableName("steering_review")
public class SteeringReview implements Serializable {

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
