package com.steeringhub.repository;

import com.steeringhub.domain.model.health.SimilarSpecPair;

import java.util.List;

public interface SimilarSpecPairRepository {

    void batchSave(List<SimilarSpecPair> pairs);

    long countByTaskIdFiltered(Long taskId, String specTitle, Long categoryId);
}
