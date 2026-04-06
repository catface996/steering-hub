package com.steeringhub.application.api.dto.response;

import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class ReviewQueueItemVO {

    private Long steeringId;
    private String steeringTitle;
    private String steeringStatus;
    private String categoryName;
    private Integer currentActiveVersion;

    private Long versionId;
    private Integer pendingVersion;
    private String pendingTitle;
    private String changeLog;
    private String versionStatus;
    private OffsetDateTime submittedAt;

    private Boolean isRevision;
}
