package com.steeringhub.application.api.dto.response;

import com.steeringhub.domain.model.steering.SteeringStatus;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.List;

@Data
public class SearchResult {

    private Long steeringId;
    private String title;
    private String content;
    private Long categoryId;
    private String categoryName;
    private SteeringStatus status;
    private Integer currentVersion;
    private List<String> tags;
    private String keywords;

    /** 相关度分数 0-1 */
    private Double score;

    /** 匹配档位：high / good / fair */
    private String matchLevel;

    /** 检索命中原因：semantic / fulltext / hybrid */
    private String matchType;

    private OffsetDateTime updatedAt;
}
