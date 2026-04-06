package com.steeringhub.application.api.dto.response;

import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class QueryLogVO {

    private Long id;
    private String queryText;
    private String searchMode;
    private Integer resultCount;
    private String resultSteeringIds;
    private String source;
    private String repo;
    private String taskDescription;
    private Integer responseTimeMs;
    private Boolean isEffective;
    private String failureReason;
    private String expectedTopic;
    private String modelName;
    private String agentName;
    private OffsetDateTime createdAt;
}
