package com.steeringhub.application.api.dto.response;

import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class SpecDetailVO {

    private Long id;
    private String title;
    private String tags;
    private String keywords;
    private String content;
    private String status;
    private OffsetDateTime updatedAt;
}
