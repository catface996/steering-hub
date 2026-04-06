package com.steeringhub.repository.postgres.po;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.OffsetDateTime;

@Data
@TableName("steering_query_log")
public class SteeringQueryLogPO {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String queryText;

    private String searchMode;

    private Integer resultCount;

    private String resultSteeringIds;

    private String source;

    private String repo;

    private String taskDescription;

    private Integer responseTimeMs;

    private Boolean isEffective;

    private String failureReason;

    private String expectedTopic;

    private String modelName;

    private String agentName;

    @TableField(fill = FieldFill.INSERT)
    private OffsetDateTime createdAt;
}
