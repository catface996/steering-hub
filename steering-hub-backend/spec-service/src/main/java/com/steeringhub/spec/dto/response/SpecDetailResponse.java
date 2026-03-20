package com.steeringhub.spec.dto.response;

import com.steeringhub.common.enums.SpecStatus;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.List;

@Data
public class SpecDetailResponse {

    private Long id;
    private String title;
    private String content;
    private Long categoryId;
    private String categoryName;
    private SpecStatus status;
    private Integer currentVersion;
    private List<String> tags;
    private String keywords;
    private List<String> agentQueries;
    private String author;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
