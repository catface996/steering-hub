package com.steeringhub.domain.model.steering;

import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class SteeringReview {

    private Long id;
    private Long steeringId;
    private Integer steeringVersion;
    private ReviewAction action;
    private String comment;
    private Long reviewerId;
    private String reviewerName;
    private OffsetDateTime createdAt;
}
