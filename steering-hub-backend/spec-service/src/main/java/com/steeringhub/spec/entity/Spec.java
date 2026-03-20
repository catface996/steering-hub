package com.steeringhub.spec.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.steeringhub.common.enums.SpecStatus;
import lombok.Data;

import java.io.Serializable;
import java.time.OffsetDateTime;
import java.util.List;

@Data
@TableName(value = "spec", autoResultMap = true)
public class Spec implements Serializable {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String title;

    private String content;

    private Long categoryId;

    private SpecStatus status;

    private Integer currentVersion;

    /** 逗号分隔的标签列表，或使用 JSON 存储 */
    private String tags;

    private String keywords;

    private String author;

    /** embedding vector(512) 以字符串形式存储，实际使用时通过 native SQL 操作 */
    @TableField(exist = false)
    private float[] embedding;

    /** 向量检索时的相似度分数（1 - 余弦距离），仅在 vectorSearch 时填充 */
    @TableField(exist = false)
    private Double similarityScore;

    private Long createdBy;

    private Long updatedBy;

    @TableField(fill = FieldFill.INSERT)
    private OffsetDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private OffsetDateTime updatedAt;

    @TableLogic
    private Boolean deleted;
}
