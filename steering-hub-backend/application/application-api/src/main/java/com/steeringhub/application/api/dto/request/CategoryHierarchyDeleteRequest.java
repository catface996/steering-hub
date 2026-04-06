package com.steeringhub.application.api.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CategoryHierarchyDeleteRequest {

    @NotNull
    private Long parentCategoryId;

    @NotNull
    private Long childCategoryId;
}
