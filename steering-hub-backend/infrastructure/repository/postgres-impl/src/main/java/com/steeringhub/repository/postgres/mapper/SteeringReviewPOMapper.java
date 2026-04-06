package com.steeringhub.repository.postgres.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.steeringhub.repository.postgres.po.SteeringReviewPO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface SteeringReviewPOMapper extends BaseMapper<SteeringReviewPO> {

    List<SteeringReviewPO> selectBySteeringId(@Param("steeringId") Long steeringId);
}
