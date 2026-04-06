package com.steeringhub.application.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateCategoryRequest {

    @NotBlank(message = "分类名称不能为空")
    private String name;

    private String code;

    private String description;

    private Long parentId;
}
