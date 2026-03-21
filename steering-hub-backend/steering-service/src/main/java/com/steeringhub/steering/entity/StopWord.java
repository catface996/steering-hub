package com.steeringhub.steering.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.io.Serializable;
import java.time.OffsetDateTime;

/**
 * 停用词实体
 */
@Data
@TableName("stop_word")
public class StopWord implements Serializable {

    @TableId(type = IdType.AUTO)
    private Long id;

    /**
     * 停用词
     */
    private String word;

    /**
     * 语言: zh-中文, en-英文
     */
    private String language;

    /**
     * 是否启用
     */
    private Boolean enabled;

    /**
     * 创建时间
     */
    @TableField(fill = FieldFill.INSERT)
    private OffsetDateTime createdAt;

    /**
     * 创建人
     */
    private String createdBy;
}
