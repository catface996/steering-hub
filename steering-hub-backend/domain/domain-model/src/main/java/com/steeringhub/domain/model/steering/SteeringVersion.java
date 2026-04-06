package com.steeringhub.domain.model.steering;

import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class SteeringVersion {

    private Long id;
    private Long steeringId;
    private Integer version;
    private String title;
    private String content;
    private String tags;
    private String keywords;
    private String changeLog;
    private String status;
    private Long createdBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
