package com.steeringhub.application.api.dto.response;

import lombok.Data;

@Data
public class BindingResultResponse {

    private Long bindingId;
    private Long repoId;
    private Long steeringId;
    private Boolean mandatory;
    private String warning;
}
