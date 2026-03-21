package com.steeringhub.steering.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.io.Serializable;
import java.time.OffsetDateTime;

@Data
@TableName("steering_usage")
public class SteeringUsage implements Serializable {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long steeringId;

    private Integer steeringVersion;

    private Long repoId;

    private String repoName;

    private String taskDescription;

    private String agentId;

    private String contextType;

    @TableField(fill = FieldFill.INSERT)
    private OffsetDateTime usedAt;
}
