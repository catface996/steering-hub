package com.steeringhub.application.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ComplianceCheckRequest {

    @NotBlank(message = "代码片段不能为空")
    private String codeSnippet;

    @NotBlank(message = "仓库全名不能为空")
    private String repoFullName;

    private String taskDescription;

    /** 指定要对比的规范类别，null 则检查所有该 repo 使用过的规范 */
    private Long categoryId;
}
