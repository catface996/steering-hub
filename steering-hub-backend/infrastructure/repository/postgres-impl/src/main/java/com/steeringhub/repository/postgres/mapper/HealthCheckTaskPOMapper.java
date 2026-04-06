package com.steeringhub.repository.postgres.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.steeringhub.repository.postgres.po.HealthCheckTaskPO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface HealthCheckTaskPOMapper extends BaseMapper<HealthCheckTaskPO> {

    HealthCheckTaskPO findLatestCompleted();

    HealthCheckTaskPO findRunning();
}
