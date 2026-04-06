package com.steeringhub.domain.model.health;

import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class HealthCheckTask {

    private Long id;
    private String status;
    private Integer similarPairCount;
    private Integer activeSpecCount;
    private OffsetDateTime startedAt;
    private OffsetDateTime completedAt;
    private String errorMessage;
}
