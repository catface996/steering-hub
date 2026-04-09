package com.steeringhub.repository.postgres.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.steeringhub.repository.postgres.po.SteeringPO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface SteeringPOMapper extends BaseMapper<SteeringPO> {

    List<SteeringPO> fullTextSearch(@Param("query") String query,
                                    @Param("categoryId") Long categoryId,
                                    @Param("limit") int limit);

    List<SteeringPO> vectorSearch(@Param("embedding") String embeddingStr,
                                  @Param("limit") int limit,
                                  @Param("categoryId") Long categoryId);

    int updateEmbedding(@Param("steeringId") Long steeringId,
                        @Param("embedding") String embeddingStr);

    int updateContentEmbedding(@Param("id") Long id,
                               @Param("vecStr") String vecStr);

    List<SteeringPO> findTopKSimilarByContentEmbedding(@Param("excludeId") Long excludeId,
                                                        @Param("vecStr") String vecStr,
                                                        @Param("limit") int limit);

    List<SteeringPO> findTopKSimilarBySpecId(@Param("specId") Long specId,
                                              @Param("limit") int limit);

    List<Long> findActiveSpecIdsWithEmbedding();

    int countActiveSpecs();

    List<SteeringPO> findAllActiveWithEmbedding();

    int compareAndSetStatus(@Param("id") Long id,
                            @Param("expectedStatus") String expectedStatus,
                            @Param("targetStatus") String targetStatus);

    int commitActivate(@Param("id") Long id,
                       @Param("title") String title,
                       @Param("content") String content,
                       @Param("tags") String tags,
                       @Param("keywords") String keywords,
                       @Param("currentVersion") Integer currentVersion,
                       @Param("embeddingStr") String embeddingStr,
                       @Param("contentEmbeddingStr") String contentEmbeddingStr);

    List<SteeringPO> listByCondition(@Param("status") String status,
                                     @Param("categoryId") Long categoryId,
                                     @Param("keyword") String keyword,
                                     @Param("offset") int offset,
                                     @Param("size") int size);

    long countByCondition(@Param("status") String status,
                          @Param("categoryId") Long categoryId,
                          @Param("keyword") String keyword);
}
