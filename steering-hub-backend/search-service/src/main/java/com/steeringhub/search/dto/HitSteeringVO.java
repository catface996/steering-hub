package com.steeringhub.search.dto;

import lombok.Data;

@Data
public class HitSteeringVO {
    private Long id;
    private String title;
    private String contentSummary;
    private String status;
    private Integer currentVersion;
    private String tags;
}
