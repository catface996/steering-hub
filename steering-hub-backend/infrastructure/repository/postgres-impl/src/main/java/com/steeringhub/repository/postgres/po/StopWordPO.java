package com.steeringhub.repository.postgres.po;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.OffsetDateTime;

@Data
@TableName("stop_word")
public class StopWordPO {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String word;

    private String language;

    private Boolean enabled;

    @TableField(fill = FieldFill.INSERT)
    private OffsetDateTime createdAt;

    private String createdBy;
}
