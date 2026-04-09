package com.steeringhub.repository.postgres.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.steeringhub.repository.postgres.po.SteeringQueryLogPO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Map;

@Mapper
public interface SteeringQueryLogPOMapper extends BaseMapper<SteeringQueryLogPO> {

    int countWeeklySearches();

    int countByDays(@Param("days") int days);

    int countEffectiveByDays(@Param("days") int days);

    int countIneffectiveByDays(@Param("days") int days);

    int countPendingByDays(@Param("days") int days);

    List<Map<String, Object>> findTopQueriesByDays(@Param("days") int days, @Param("limit") int limit);

    List<Map<String, Object>> findActiveAgentsByDays(@Param("days") int days, @Param("limit") int limit);

    Double avgResponseTimeByDays(@Param("days") int days);
}
