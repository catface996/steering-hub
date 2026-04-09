package com.steeringhub.application.api.dto.response;

import com.steeringhub.domain.model.steering.SteeringStatus;
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
    /** @deprecated Use tags instead. Keywords have been merged into tags. */
    @Deprecated
    private String keywords;
    private List<String> agentQueries;
    private String author;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
