package com.steeringhub.steering.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class SimilarPairVO {

    private Long id;

    private SimilarSpecInfoVO specA;

    private SimilarSpecInfoVO specB;

    private BigDecimal overallScore;

    private BigDecimal vectorScore;

    private BigDecimal titleScore;

    private BigDecimal tagsScore;

    private BigDecimal keywordsScore;

    private List<String> reasonTags;
}
