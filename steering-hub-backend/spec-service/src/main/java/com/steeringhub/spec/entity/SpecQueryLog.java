package com.steeringhub.spec.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.io.Serializable;
import java.time.OffsetDateTime;

/**
 * 规范查询日志实体
 */
@Data
@TableName("spec_query_log")
public class SpecQueryLog implements Serializable {

    private static final long serialVersionUID = 1L;

    @TableId(type = IdType.AUTO)
    private Long id;

    private String queryText;

    private String searchMode;

    private Integer resultCount;

    private String resultSpecIds;  // JSON字符串

    private String agentId;

    private String repo;

    private String taskDescription;

    private Integer responseTimeMs;

    @TableField(fill = FieldFill.INSERT)
    private OffsetDateTime createdAt;
}
