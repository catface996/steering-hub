package com.steeringhub.spec.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.steeringhub.spec.entity.SpecVersion;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface SpecVersionMapper extends BaseMapper<SpecVersion> {

    List<SpecVersion> selectBySpecId(@Param("specId") Long specId);

    SpecVersion selectBySpecIdAndVersion(@Param("specId") Long specId, @Param("version") int version);
}
