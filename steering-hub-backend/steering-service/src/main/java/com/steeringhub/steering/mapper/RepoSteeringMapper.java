package com.steeringhub.steering.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.steeringhub.steering.dto.response.RepoItem;
import com.steeringhub.steering.dto.response.RepoSteeringItem;
import com.steeringhub.steering.entity.RepoSteering;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface RepoSteeringMapper extends BaseMapper<RepoSteering> {

    void upsertBinding(@Param("repoId") Long repoId,
                       @Param("steeringId") Long steeringId,
                       @Param("mandatory") boolean mandatory);

    int deleteByPair(@Param("repoId") Long repoId, @Param("steeringId") Long steeringId);

    void deleteByRepoId(@Param("repoId") Long repoId);

    List<RepoSteeringItem> listByRepoIdPaged(@Param("repoId") Long repoId,
                                             @Param("offset") int offset,
                                             @Param("size") int size);

    long countByRepoId(@Param("repoId") Long repoId);

    List<RepoItem> listBySteeringIdPaged(@Param("steeringId") Long steeringId,
                                         @Param("offset") int offset,
                                         @Param("size") int size);

    long countBySteeringId(@Param("steeringId") Long steeringId);

    RepoSteering findByPair(@Param("repoId") Long repoId, @Param("steeringId") Long steeringId);

    List<RepoSteering> listAllByRepoId(@Param("repoId") Long repoId);
}
