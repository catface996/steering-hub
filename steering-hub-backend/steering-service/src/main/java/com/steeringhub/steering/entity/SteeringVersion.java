package com.steeringhub.steering.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.io.Serializable;
import java.time.OffsetDateTime;

@Data
@TableName("steering_version")
public class SteeringVersion implements Serializable {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long steeringId;

    private Integer version;

    private String title;

    private String content;

    private String tags;

    private String keywords;

    private String changeLog;

    private String status;

    private Long createdBy;

    @TableField(fill = FieldFill.INSERT)
    private OffsetDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private OffsetDateTime updatedAt;
}
