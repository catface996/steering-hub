package com.steeringhub.steering.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;

@Data
public class UpdateSteeringRequest {

    @NotBlank(message = "规范标题不能为空")
    private String title;

    @NotBlank(message = "规范内容不能为空")
    private String content;

    private Long categoryId;

    private List<String> tags;

    private String keywords;

    private List<String> agentQueries;

    private String changeLog;
}
