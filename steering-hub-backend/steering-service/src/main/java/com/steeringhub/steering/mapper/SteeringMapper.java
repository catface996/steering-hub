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

    /**
     * 更新规范的 content_embedding 向量
     */
    int updateContentEmbedding(@Param("id") Long id,
                               @Param("vecStr") String vecStr);

    /**
     * 基于 content_embedding 找 Top-K 相似规范（排除自身，仅 active，以向量字符串为参数）
     */
    List<Steering> findTopKSimilarByContentEmbedding(@Param("excludeId") Long excludeId,
                                                     @Param("vecStr") String vecStr,
                                                     @Param("limit") int limit);

    /**
     * 基于规范自身的 content_embedding 找 Top-K 相似规范（排除自身，仅 active）
     */
    List<Steering> findTopKSimilarBySpecId(@Param("specId") Long specId,
                                           @Param("limit") int limit);

    /**
     * 查询所有 active 且 content_embedding 不为 NULL 的规范 ID 列表
     */
    List<Long> findActiveSpecIdsWithEmbedding();
}
