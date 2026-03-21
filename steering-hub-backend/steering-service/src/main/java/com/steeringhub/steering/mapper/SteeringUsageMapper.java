package com.steeringhub.steering.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.steeringhub.steering.entity.SteeringUsage;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Map;

@Mapper
public interface SteeringUsageMapper extends BaseMapper<SteeringUsage> {

    List<SteeringUsage> selectByRepoId(@Param("repoId") Long repoId);

    List<SteeringUsage> selectBySteeringId(@Param("steeringId") Long steeringId);

    /**
     * 统计规范使用频率（Top N）
     */
    List<Map<String, Object>> selectUsageStats(@Param("limit") int limit);
}
