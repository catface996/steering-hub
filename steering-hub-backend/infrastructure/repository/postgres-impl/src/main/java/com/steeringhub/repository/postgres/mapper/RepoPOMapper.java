package com.steeringhub.repository.postgres.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.steeringhub.repository.postgres.po.RepoPO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface RepoPOMapper extends BaseMapper<RepoPO> {

    List<RepoPO> listByCondition(@Param("name") String name,
                                 @Param("team") String team,
                                 @Param("enabled") Boolean enabled,
                                 @Param("offset") int offset,
                                 @Param("size") int size);

    long countByCondition(@Param("name") String name,
                          @Param("team") String team,
                          @Param("enabled") Boolean enabled);

    RepoPO findByFullNameIncludeDeleted(@Param("fullName") String fullName);

    RepoPO findEnabledByFullName(@Param("fullName") String fullName);
}
