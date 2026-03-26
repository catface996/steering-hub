package com.steeringhub.steering.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class CreateCategoryRequest {

    @NotBlank(message = "分类名称不能为空")
    private String name;

    @NotBlank(message = "分类代码不能为空")
    @Pattern(regexp = "^[a-z0-9-]+$", message = "分类代码只允许小写字母、数字和连字符")
    private String code;

    private String description;

    private Long parentId;
}
