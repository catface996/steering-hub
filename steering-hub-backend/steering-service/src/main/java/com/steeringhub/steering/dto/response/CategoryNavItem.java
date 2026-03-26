package com.steeringhub.steering.dto.response;

import lombok.Data;

@Data
public class CategoryNavItem {

    private Long id;

    private String name;

    private String code;

    private String description;

    private Integer childCount;

    private Integer sortOrder;
}
