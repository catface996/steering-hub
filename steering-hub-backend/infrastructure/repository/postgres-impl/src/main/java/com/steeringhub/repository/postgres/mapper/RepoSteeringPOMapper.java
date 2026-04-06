package com.steeringhub.repository.postgres.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.steeringhub.repository.postgres.po.RepoSteeringPO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface RepoSteeringPOMapper extends BaseMapper<RepoSteeringPO> {

    void upsertBinding(@Param("repoId") Long repoId,
                       @Param("steeringId") Long steeringId,
                       @Param("mandatory") boolean mandatory);

    int deleteByPair(@Param("repoId") Long repoId, @Param("steeringId") Long steeringId);

    void deleteByRepoId(@Param("repoId") Long repoId);

    RepoSteeringPO findByPair(@Param("repoId") Long repoId, @Param("steeringId") Long steeringId);

    List<RepoSteeringPO> listAllByRepoId(@Param("repoId") Long repoId);

    long countByRepoId(@Param("repoId") Long repoId);

    long countBySteeringId(@Param("steeringId") Long steeringId);
}
