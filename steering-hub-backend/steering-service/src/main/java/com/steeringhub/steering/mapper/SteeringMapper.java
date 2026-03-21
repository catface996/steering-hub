package com.steeringhub.steering.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.steeringhub.steering.entity.Steering;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface SteeringMapper extends BaseMapper<Steering> {

    /**
     * 全文检索（PostgreSQL tsvector）
     */
    List<Steering> fullTextSearch(@Param("query") String query,
                              @Param("categoryId") Long categoryId,
                              @Param("limit") int limit);

    /**
     * 向量语义检索（pgvector cosine similarity）
     * 返回包含相似度分数的结果
     */
    List<Steering> vectorSearch(@Param("embedding") String embeddingStr,
                            @Param("limit") int limit,
                            @Param("categoryId") Long categoryId);

    /**
     * 更新规范的 embedding 向量
     */
    int updateEmbedding(@Param("steeringId") Long steeringId,
                        @Param("embedding") String embeddingStr);
}
