package com.steeringhub.steering.dto.response;

import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class RepoSteeringItem {

    private Long steeringId;

    private String steeringTitle;

    private String steeringStatus;

    private Boolean mandatory;

    private Long bindingId;

    private OffsetDateTime createdAt;
}
