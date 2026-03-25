package com.steeringhub.steering.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.OffsetDateTime;

@Data
@TableName("health_check_task")
public class HealthCheckTask {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String status;

    private Integer similarPairCount;

    private Integer activeSpecCount;

    private OffsetDateTime startedAt;

    private OffsetDateTime completedAt;

    private String errorMessage;
}
