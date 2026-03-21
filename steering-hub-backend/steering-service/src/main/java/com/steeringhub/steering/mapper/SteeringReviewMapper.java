package com.steeringhub.steering.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.steeringhub.steering.entity.SteeringReview;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface SteeringReviewMapper extends BaseMapper<SteeringReview> {

    List<SteeringReview> selectBySteeringId(@Param("steeringId") Long steeringId);
}
