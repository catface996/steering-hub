package com.steeringhub.application.api.dto.response;

import lombok.Data;

import java.time.OffsetDateTime;
import java.util.List;

@Data
public class QueryLogDetailVO {

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

    private List<HitSteeringVO> hitSteerings;
}
