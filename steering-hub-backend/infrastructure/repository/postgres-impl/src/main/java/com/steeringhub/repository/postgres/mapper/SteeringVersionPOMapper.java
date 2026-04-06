package com.steeringhub.repository.postgres.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.steeringhub.repository.postgres.po.SteeringVersionPO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface SteeringVersionPOMapper extends BaseMapper<SteeringVersionPO> {

    List<SteeringVersionPO> selectBySteeringId(@Param("steeringId") Long steeringId);

    SteeringVersionPO selectBySteeringIdAndVersion(@Param("steeringId") Long steeringId, @Param("version") int version);

    Integer selectMaxVersionBySteeringId(@Param("steeringId") Long steeringId);

    int updateVersionStatus(@Param("steeringId") Long steeringId,
                            @Param("fromStatus") String fromStatus,
                            @Param("toStatus") String toStatus);

    SteeringVersionPO findVersionBySteeringIdAndStatus(@Param("steeringId") Long steeringId,
                                                        @Param("status") String status);

    List<SteeringVersionPO> listVersionsBySteeringId(@Param("steeringId") Long steeringId,
                                                      @Param("offset") long offset,
                                                      @Param("size") long size);

    int countVersionsBySteeringId(@Param("steeringId") Long steeringId);

    List<SteeringVersionPO> selectBySteeringIdIn(@Param("steeringIds") List<Long> steeringIds);

    void updateVersion(SteeringVersionPO po);

    int updateStatusByVersion(@Param("steeringId") Long steeringId,
                              @Param("versionNumber") Integer versionNumber,
                              @Param("newStatus") String newStatus);
}
