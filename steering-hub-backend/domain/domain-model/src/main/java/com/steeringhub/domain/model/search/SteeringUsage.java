package com.steeringhub.domain.model.search;

import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class SteeringUsage {

    private Long id;
    private Long steeringId;
    private Integer steeringVersion;
    private Long repoId;
    private String repoName;
    private String taskDescription;
    private String agentId;
    private String contextType;
    private OffsetDateTime usedAt;
}
