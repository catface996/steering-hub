package com.steeringhub.steering.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.steeringhub.steering.entity.ApiKey;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface ApiKeyMapper extends BaseMapper<ApiKey> {

    ApiKey findEnabledByKeyValue(@Param("keyValue") String keyValue);

    List<ApiKey> findAllOrderByCreatedAtDesc();
}
