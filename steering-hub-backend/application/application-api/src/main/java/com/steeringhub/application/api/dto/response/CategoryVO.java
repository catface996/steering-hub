package com.steeringhub.application.api.dto.response;

import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class CategoryVO {

    private Long id;
    private String name;
    private String code;
    private String description;
    private Long parentId;
    private Integer sortOrder;
    private Boolean enabled;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
