package com.steeringhub.repository.postgres.po;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.OffsetDateTime;

@Data
@TableName("repo_steering")
public class RepoSteeringPO {

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
