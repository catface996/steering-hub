package com.steeringhub.repository.postgres.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.steeringhub.repository.postgres.po.SteeringUsagePO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Map;

@Mapper
public interface SteeringUsagePOMapper extends BaseMapper<SteeringUsagePO> {

    List<SteeringUsagePO> selectByRepoId(@Param("repoId") Long repoId);

    List<SteeringUsagePO> selectBySteeringId(@Param("steeringId") Long steeringId);

    List<Map<String, Object>> selectUsageStats(@Param("limit") int limit);
}
