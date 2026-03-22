package com.steeringhub.steering.dto.response;

import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class HealthCheckTaskVO {

    private Long taskId;

    private String status;

    private Integer similarPairCount;

    private Integer activeSpecCount;

    private OffsetDateTime startedAt;

    private OffsetDateTime completedAt;

    private Boolean isExpired;
}
