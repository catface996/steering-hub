package com.steeringhub.domain.model.repo;

import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class RepoSteering {

    private Long id;
    private Long repoId;
    private Long steeringId;
    private Boolean mandatory;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
