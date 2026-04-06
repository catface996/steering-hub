package com.steeringhub.application.api.dto.response;

import lombok.Data;

@Data
public class RelatedSteering {

    private Long steeringId;
    private String steeringTitle;
    private String steeringContent;
    private Double relevanceScore;
}
