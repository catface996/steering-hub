package com.steeringhub.application.api.dto.response;

import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class SteeringVersionVO {
    private Long id;
    private Integer versionNumber;
    private String status;
    private String changeSummary;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
