package com.steeringhub.steering.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.io.Serializable;
import java.time.OffsetDateTime;

@Data
@TableName("repo_steering")
public class RepoSteering implements Serializable {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long repoId;

    private Long steeringId;

    private Boolean mandatory;

    @TableField(fill = FieldFill.INSERT)
    private OffsetDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private OffsetDateTime updatedAt;
}
