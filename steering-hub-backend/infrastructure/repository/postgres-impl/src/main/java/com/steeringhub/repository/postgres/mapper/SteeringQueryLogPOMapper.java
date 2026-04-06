package com.steeringhub.repository.postgres.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.steeringhub.repository.postgres.po.SteeringQueryLogPO;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface SteeringQueryLogPOMapper extends BaseMapper<SteeringQueryLogPO> {

    int countWeeklySearches();
}
