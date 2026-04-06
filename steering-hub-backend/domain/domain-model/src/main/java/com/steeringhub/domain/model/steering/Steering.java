package com.steeringhub.domain.model.steering;

import lombok.Data;

import java.time.OffsetDateTime;
import java.util.List;

@Data
public class Steering {

    private Long id;
    private String title;
    private String content;
    private Long categoryId;
    private SteeringStatus status;
    private Integer currentVersion;
    private String tags;
    private String keywords;
    private List<String> agentQueries;
    private String author;
    private Integer lockVersion;
    private Long createdBy;
    private Long updatedBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public boolean isActive() {
        return status != null && status.isActive();
    }
}
