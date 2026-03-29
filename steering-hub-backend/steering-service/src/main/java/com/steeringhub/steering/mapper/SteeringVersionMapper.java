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

    Integer selectMaxVersionBySteeringId(@Param("steeringId") Long steeringId);

    int updateVersionStatus(@Param("steeringId") Long steeringId,
                            @Param("fromStatus") String fromStatus,
                            @Param("toStatus") String toStatus);

    SteeringVersion findVersionBySteeringIdAndStatus(@Param("steeringId") Long steeringId,
                                                     @Param("status") String status);

    List<SteeringVersion> listVersionsBySteeringId(@Param("steeringId") Long steeringId,
                                                   @Param("offset") long offset,
                                                   @Param("size") long size);

    int countVersionsBySteeringId(@Param("steeringId") Long steeringId);

    SteeringVersion findVersionByNumber(@Param("steeringId") Long steeringId,
                                        @Param("versionNumber") int versionNumber);

    List<com.steeringhub.steering.dto.response.ReviewQueueItemVO> listReviewQueue(@Param("offset") long offset,
                                                                                    @Param("size") long size);

    int countReviewQueue();
}
