package com.steeringhub.repository.postgres;

import com.steeringhub.domain.model.repo.RepoSteering;
import com.steeringhub.repository.RepoSteeringRepository;
import com.steeringhub.repository.postgres.mapper.RepoSteeringPOMapper;
import com.steeringhub.repository.postgres.po.RepoSteeringPO;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.stream.Collectors;

@Repository
@RequiredArgsConstructor
public class RepoSteeringRepositoryImpl implements RepoSteeringRepository {

    private final RepoSteeringPOMapper mapper;

    @Override
    public void upsertBinding(Long repoId, Long steeringId, boolean mandatory) {
        mapper.upsertBinding(repoId, steeringId, mandatory);
    }

    @Override
    public int deleteByPair(Long repoId, Long steeringId) {
        return mapper.deleteByPair(repoId, steeringId);
    }

    @Override
    public void deleteByRepoId(Long repoId) {
        mapper.deleteByRepoId(repoId);
    }

    @Override
    public RepoSteering findByPair(Long repoId, Long steeringId) {
        RepoSteeringPO po = mapper.findByPair(repoId, steeringId);
        return po == null ? null : toEntity(po);
    }

    @Override
    public List<RepoSteering> findAllByRepoId(Long repoId) {
        return mapper.listAllByRepoId(repoId)
                .stream().map(this::toEntity).collect(Collectors.toList());
    }

    @Override
    public long countByRepoId(Long repoId) {
        return mapper.countByRepoId(repoId);
    }

    @Override
    public long countBySteeringId(Long steeringId) {
        return mapper.countBySteeringId(steeringId);
    }

    private RepoSteering toEntity(RepoSteeringPO po) {
        RepoSteering entity = new RepoSteering();
        BeanUtils.copyProperties(po, entity);
        return entity;
    }
}
