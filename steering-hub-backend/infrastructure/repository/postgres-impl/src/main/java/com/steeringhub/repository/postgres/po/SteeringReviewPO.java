package com.steeringhub.repository.postgres.po;

import com.baomidou.mybatisplus.annotation.*;
import com.steeringhub.domain.model.steering.ReviewAction;
import com.steeringhub.repository.postgres.typehandler.ReviewActionTypeHandler;
import lombok.Data;

import java.time.OffsetDateTime;

@Data
@TableName(value = "steering_review", autoResultMap = true)
public class SteeringReviewPO {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long steeringId;

    private Integer steeringVersion;

    @TableField(typeHandler = ReviewActionTypeHandler.class)
    private ReviewAction action;

    private String comment;

    private Long reviewerId;

    private String reviewerName;

    @TableField(fill = FieldFill.INSERT)
    private OffsetDateTime createdAt;
}
