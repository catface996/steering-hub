package com.steeringhub.application.api.dto.response;

import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class DiffVO {

    private Long steeringId;
    private String steeringStatus;

    private VersionSnapshot activeVersion;
    private VersionSnapshot pendingVersion;

    @Data
    public static class VersionSnapshot {
        private Integer versionNumber;
        private String title;
        private String content;
        private String tags;
        private String keywords;
        private String status;
        private String changeLog;
        private OffsetDateTime createdAt;
    }
}
