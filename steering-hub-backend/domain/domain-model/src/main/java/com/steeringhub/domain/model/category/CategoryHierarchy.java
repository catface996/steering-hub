package com.steeringhub.domain.model.category;

import lombok.Data;

@Data
public class CategoryHierarchy {

    private Long parentCategoryId;
    private Long childCategoryId;
    private Integer sortOrder;
}
