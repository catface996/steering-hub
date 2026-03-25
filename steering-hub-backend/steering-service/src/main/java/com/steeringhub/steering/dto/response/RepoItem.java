package com.steeringhub.steering.dto.response;

import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class RepoItem {

    private Long repoId;

    private String repoName;

    private String repoFullName;

    private Boolean repoEnabled;

    private Boolean mandatory;

    private Long bindingId;

    private OffsetDateTime createdAt;
}
