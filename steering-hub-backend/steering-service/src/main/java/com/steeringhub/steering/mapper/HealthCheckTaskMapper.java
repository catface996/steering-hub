package com.steeringhub.steering.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.steeringhub.steering.entity.HealthCheckTask;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface HealthCheckTaskMapper extends BaseMapper<HealthCheckTask> {

    int insertAndGetId(HealthCheckTask task);

    int updateStatus(@Param("id") Long id,
                     @Param("status") String status,
                     @Param("completedAt") java.time.OffsetDateTime completedAt,
                     @Param("similarPairCount") Integer similarPairCount,
                     @Param("errorMessage") String errorMessage);

    HealthCheckTask findLatestCompleted();

    HealthCheckTask findRunning();
}
