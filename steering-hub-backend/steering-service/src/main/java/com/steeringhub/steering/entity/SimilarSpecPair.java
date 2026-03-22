package com.steeringhub.steering.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Data
@TableName("similar_spec_pair")
public class SimilarSpecPair {

    @TableId(type = IdType.AUTO)
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
