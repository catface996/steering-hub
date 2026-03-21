package com.steeringhub.spec.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.io.Serializable;
import java.time.OffsetDateTime;

@Data
@TableName("api_key")
public class ApiKey implements Serializable {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String name;

    private String keyValue;

    private String description;

    private Boolean enabled;

    private OffsetDateTime lastUsedAt;

    @TableField(fill = FieldFill.INSERT)
    private OffsetDateTime createdAt;

    private String createdBy;
}
