package com.steeringhub.repository;

import com.steeringhub.common.response.PageResult;
import com.steeringhub.domain.model.steering.Steering;
import com.steeringhub.repository.query.SteeringQuery;

import java.util.List;

public interface SteeringRepository {

    Steering getById(Long id);

    PageResult<Steering> page(SteeringQuery query, int page, int size);

    void save(Steering steering);

    void update(Steering steering);

    void deleteById(Long id);

    List<Steering> vectorSearch(String embeddingStr, int limit, Long categoryId);

    List<Steering> fullTextSearch(String keyword, Long categoryId, int limit);

    int updateEmbedding(Long steeringId, String embeddingStr);

    int updateContentEmbedding(Long id, String vecStr);

    List<Steering> findTopKSimilarByContentEmbedding(Long excludeId, String vecStr, int limit);

    List<Steering> findTopKSimilarBySpecId(Long specId, int limit);

    List<Long> findActiveSpecIdsWithEmbedding();

    int countActiveSpecs();

    List<Steering> findAllActiveWithEmbedding();

    int claimActivateLock(Long id, Integer lockVersion);

    int commitActivate(Long id, String title, String content, String tags,
                       Integer currentVersion, String embeddingStr, String contentEmbeddingStr);
}
