package com.steeringhub.search.dto;

import com.steeringhub.common.enums.SpecStatus;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.List;

@Data
public class SearchResult {

    private Long specId;
    private String title;
    private String content;
    private Long categoryId;
    private String categoryName;
    private SpecStatus status;
    private Integer currentVersion;
    private List<String> tags;
    private String keywords;

    /** 相关度分数 0-1 */
    private Double score;

    /** 检索命中原因：semantic / fulltext / hybrid */
    private String matchType;

    private OffsetDateTime updatedAt;
}
