package com.steeringhub.steering.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.steeringhub.steering.entity.SteeringVersion;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface SteeringVersionMapper extends BaseMapper<SteeringVersion> {

    List<SteeringVersion> selectBySteeringId(@Param("steeringId") Long steeringId);

    SteeringVersion selectBySteeringIdAndVersion(@Param("steeringId") Long steeringId, @Param("version") int version);
}
