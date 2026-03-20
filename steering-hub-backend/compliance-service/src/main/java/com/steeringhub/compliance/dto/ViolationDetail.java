package com.steeringhub.compliance.dto;

import lombok.Data;

@Data
public class ViolationDetail {

    private Long specId;
    private String specTitle;
    private String violationType;
    private String description;
    private String suggestion;
    private String severity; // HIGH / MEDIUM / LOW
}
