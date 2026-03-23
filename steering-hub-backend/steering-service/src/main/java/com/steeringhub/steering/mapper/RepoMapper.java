package com.steeringhub.steering.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.steeringhub.steering.entity.Repo;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface RepoMapper extends BaseMapper<Repo> {

    List<Repo> listByCondition(@Param("name") String name,
                               @Param("team") String team,
                               @Param("enabled") Boolean enabled,
                               @Param("offset") int offset,
                               @Param("size") int size);

    long countByCondition(@Param("name") String name,
                          @Param("team") String team,
                          @Param("enabled") Boolean enabled);

    Repo findByFullNameIncludeDeleted(@Param("fullName") String fullName);

    Repo findEnabledByFullName(@Param("fullName") String fullName);
}
