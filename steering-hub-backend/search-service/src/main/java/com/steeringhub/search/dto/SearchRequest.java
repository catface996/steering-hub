package com.steeringhub.search.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SearchRequest {

    @NotBlank(message = "检索关键词不能为空")
    private String query;

    private Long categoryId;

    private Integer limit = 10;

    /** semantic | fulltext | hybrid */
    private String mode = "hybrid";
}
