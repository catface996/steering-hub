package com.steeringhub.spec.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.io.Serializable;
import java.time.OffsetDateTime;

@Data
@TableName("spec_version")
public class SpecVersion implements Serializable {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long specId;

    private Integer version;

    private String title;

    private String content;

    private String tags;

    private String keywords;

    private String changeLog;

    private Long createdBy;

    @TableField(fill = FieldFill.INSERT)
    private OffsetDateTime createdAt;
}
