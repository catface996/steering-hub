package com.steeringhub.repository;

import com.steeringhub.domain.model.repo.RepoSteering;

import java.util.List;

public interface RepoSteeringRepository {

    void upsertBinding(Long repoId, Long steeringId, boolean mandatory);

    int deleteByPair(Long repoId, Long steeringId);

    void deleteByRepoId(Long repoId);

    RepoSteering findByPair(Long repoId, Long steeringId);

    List<RepoSteering> findAllByRepoId(Long repoId);

    long countByRepoId(Long repoId);

    long countBySteeringId(Long steeringId);
}
