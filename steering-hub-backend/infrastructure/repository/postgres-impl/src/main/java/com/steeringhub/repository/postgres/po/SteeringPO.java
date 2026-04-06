package com.steeringhub.repository.postgres.po;

import com.baomidou.mybatisplus.annotation.*;
import com.steeringhub.domain.model.steering.SteeringStatus;
import com.steeringhub.repository.postgres.typehandler.SteeringStatusTypeHandler;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.List;

@Data
@TableName(value = "steering", autoResultMap = true)
public class SteeringPO {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String title;

    private String content;

    private Long categoryId;

    @TableField(typeHandler = SteeringStatusTypeHandler.class)
    private SteeringStatus status;

    private Integer currentVersion;

    private String tags;

    private String keywords;

    @TableField(typeHandler = com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler.class)
    private List<String> agentQueries;

    private String author;

    @TableField(exist = false)
    private float[] embedding;

    @TableField(exist = false)
    private float[] contentEmbedding;

    @TableField(exist = false)
    private Double similarityScore;

    private Integer lockVersion;

    private Long createdBy;

    private Long updatedBy;

    @TableField(fill = FieldFill.INSERT)
    private OffsetDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private OffsetDateTime updatedAt;

    @TableLogic
    private Boolean deleted;
}
