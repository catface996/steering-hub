package com.steeringhub.steering.dto.response;

import com.steeringhub.common.enums.SteeringStatus;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.List;

@Data
public class SteeringDetailResponse {

    private Long id;
    private String title;
    private String content;
    private Long categoryId;
    private String categoryName;
    private SteeringStatus status;
    private Integer currentVersion;
    private List<String> tags;
    private String keywords;
    private List<String> agentQueries;
    private String author;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
