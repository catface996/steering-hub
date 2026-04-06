package com.steeringhub.domain.model.search;

import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class StopWord {

    private Long id;
    private String word;
    private String language;
    private Boolean enabled;
    private OffsetDateTime createdAt;
    private String createdBy;
}
