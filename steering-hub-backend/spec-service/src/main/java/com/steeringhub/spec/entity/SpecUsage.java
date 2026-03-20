package com.steeringhub.spec.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.io.Serializable;
import java.time.OffsetDateTime;

@Data
@TableName("spec_usage")
public class SpecUsage implements Serializable {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long specId;

    private Integer specVersion;

    private Long repoId;

    private String repoName;

    private String taskDescription;

    private String agentId;

    private String contextType;

    @TableField(fill = FieldFill.INSERT)
    private OffsetDateTime usedAt;
}
