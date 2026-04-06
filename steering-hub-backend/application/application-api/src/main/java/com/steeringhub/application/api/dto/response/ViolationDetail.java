package com.steeringhub.application.api.dto.response;

import lombok.Data;

@Data
public class ViolationDetail {

    private Long steeringId;
    private String steeringTitle;
    private String violationType;
    private String description;
    private String suggestion;
    private String severity;
}
