package com.steeringhub.compliance.dto;

import lombok.Data;

@Data
public class RelatedSpec {

    private Long specId;
    private String specTitle;
    private String specContent;
    private Double relevanceScore;
}
