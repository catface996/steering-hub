package com.steeringhub.domain.model.auth;

import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class ApiKey {

    private Long id;
    private String name;
    private String keyValue;
    private String description;
    private Boolean enabled;
    private OffsetDateTime lastUsedAt;
    private OffsetDateTime createdAt;
    private String createdBy;
}
