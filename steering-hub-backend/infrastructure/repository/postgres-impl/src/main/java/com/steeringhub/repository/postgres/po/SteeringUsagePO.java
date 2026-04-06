package com.steeringhub.repository.postgres.po;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.OffsetDateTime;

@Data
@TableName("steering_usage")
public class SteeringUsagePO {

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
