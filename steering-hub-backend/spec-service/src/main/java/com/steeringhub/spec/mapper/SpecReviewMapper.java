package com.steeringhub.spec.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.steeringhub.spec.entity.SpecReview;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface SpecReviewMapper extends BaseMapper<SpecReview> {

    List<SpecReview> selectBySpecId(@Param("specId") Long specId);
}
