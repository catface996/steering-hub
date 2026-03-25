package com.steeringhub.steering.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CategoryHierarchyRequest {

    @NotNull
    private Long parentCategoryId;

    @NotNull
    private Long childCategoryId;

    @Min(0)
    private Integer sortOrder = 0;
}
