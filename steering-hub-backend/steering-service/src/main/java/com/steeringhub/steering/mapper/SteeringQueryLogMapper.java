package com.steeringhub.steering.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.steeringhub.steering.entity.SteeringQueryLog;
import org.apache.ibatis.annotations.Mapper;

/**
 * 规范查询日志Mapper
 */
@Mapper
public interface SteeringQueryLogMapper extends BaseMapper<SteeringQueryLog> {

    /**
     * 统计最近 7 天的检索次数
     */
    int countWeeklySearches();
}
