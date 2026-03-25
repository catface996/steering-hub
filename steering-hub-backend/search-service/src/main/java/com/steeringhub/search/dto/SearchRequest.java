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

    /** 仓库 full_name，可选，如 "org/my-service"，传入后对绑定规范进行 boost 排序 */
    private String repo;

    /** Agent 使用的模型名称，如 claude-sonnet-4-6、gpt-4o */
    private String modelName;

    /** Agent 类型/名称，如 claude-code、codex、cursor */
    private String agentName;
}
