package com.steeringhub.domain.model.health;

import lombok.Data;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Data
public class SimilarSpecPair {

    private Long id;
    private Long taskId;
    private Long specAId;
    private Long specBId;
    private BigDecimal overallScore;
    private BigDecimal vectorScore;
    private BigDecimal titleScore;
    private BigDecimal tagsScore;
    private BigDecimal keywordsScore;
    private String reasonTags;
    private OffsetDateTime createdAt;
}
