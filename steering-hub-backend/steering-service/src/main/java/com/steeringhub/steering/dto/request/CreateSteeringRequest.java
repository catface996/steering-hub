package com.steeringhub.steering.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class CreateSteeringRequest {

    @NotBlank(message = "规范标题不能为空")
    private String title;

    @NotBlank(message = "规范内容不能为空")
    private String content;

    @NotNull(message = "规范分类不能为空")
    private Long categoryId;

    private List<String> tags;

    private String keywords;

    private String author;
}
