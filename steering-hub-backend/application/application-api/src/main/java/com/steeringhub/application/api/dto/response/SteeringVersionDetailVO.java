package com.steeringhub.application.api.dto.response;

import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class SteeringVersionDetailVO {
    private Long id;
    private Long steeringId;
    private Integer versionNumber;
    private String title;
    private String content;
    private String tags;
    private String keywords;
    private String status;
    private String changeSummary;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
