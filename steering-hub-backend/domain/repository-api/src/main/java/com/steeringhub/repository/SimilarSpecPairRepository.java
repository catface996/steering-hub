package com.steeringhub.repository;

import com.steeringhub.domain.model.health.SimilarSpecPair;

import java.util.List;

public interface SimilarSpecPairRepository {

    void batchSave(List<SimilarSpecPair> pairs);

    List<SimilarSpecPair> findByTaskIdPaged(Long taskId, int offset, int pageSize, String specTitle, Long categoryId);

    long countByTaskIdFiltered(Long taskId, String specTitle, Long categoryId);

    void deleteById(Long pairId);
}
