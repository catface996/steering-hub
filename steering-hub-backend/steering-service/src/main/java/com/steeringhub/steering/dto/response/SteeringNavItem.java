package com.steeringhub.steering.dto.response;

import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class SteeringNavItem {

    private Long id;

    private String title;

    private String tags;

    private OffsetDateTime updatedAt;
}
