package com.steeringhub.compliance.dto;

import lombok.Data;

@Data
public class RelatedSteering {

    private Long steeringId;
    private String steeringTitle;
    private String steeringContent;
    private Double relevanceScore;
}
