package com.steeringhub.spec.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.steeringhub.spec.entity.Spec;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface SpecMapper extends BaseMapper<Spec> {

    /**
     * 全文检索（PostgreSQL tsvector）
     */
    List<Spec> fullTextSearch(@Param("query") String query,
                              @Param("categoryId") Long categoryId,
                              @Param("limit") int limit);

    /**
     * 向量语义检索（pgvector cosine similarity）
     * 返回包含相似度分数的结果
     */
    List<Spec> vectorSearch(@Param("embedding") String embeddingStr,
                            @Param("limit") int limit,
                            @Param("categoryId") Long categoryId);

    /**
     * 更新规范的 embedding 向量
     */
    int updateEmbedding(@Param("specId") Long specId,
                        @Param("embedding") String embeddingStr);
}
