package com.steeringhub.common;

import com.baomidou.mybatisplus.core.handlers.MetaObjectHandler;
import org.apache.ibatis.reflection.MetaObject;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;

/**
 * MyBatis Plus 自动填充处理器
 * 自动填充实体的 createdAt 和 updatedAt 字段
 */
@Component
public class MybatisMetaObjectHandler implements MetaObjectHandler {

    @Override
    public void insertFill(MetaObject metaObject) {
        OffsetDateTime now = OffsetDateTime.now();

        // 自动填充 createdAt
        this.strictInsertFill(metaObject, "createdAt", OffsetDateTime.class, now);

        // 自动填充 updatedAt
        this.strictInsertFill(metaObject, "updatedAt", OffsetDateTime.class, now);

        // 自动填充 usedAt (用于 SpecUsage 实体)
        this.strictInsertFill(metaObject, "usedAt", OffsetDateTime.class, now);
    }

    @Override
    public void updateFill(MetaObject metaObject) {
        // 自动填充 updatedAt
        this.strictUpdateFill(metaObject, "updatedAt", OffsetDateTime.class, OffsetDateTime.now());
    }
}
