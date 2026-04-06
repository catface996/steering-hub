package com.steeringhub.application.api.dto.response;

import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class RepoVO {

    private Long id;
    private String name;
    private String fullName;
    private String description;
    private String url;
    private String language;
    private String team;
    private Boolean enabled;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
