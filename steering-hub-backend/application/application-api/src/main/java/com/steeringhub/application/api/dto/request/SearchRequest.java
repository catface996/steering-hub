package com.steeringhub.application.api.dto.request;

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

    /** 仓库 full_name，可选 */
    private String repo;

    /** Agent 使用的模型名称 */
    private String modelName;

    /** Agent 类型/名称 */
    private String agentName;
}
