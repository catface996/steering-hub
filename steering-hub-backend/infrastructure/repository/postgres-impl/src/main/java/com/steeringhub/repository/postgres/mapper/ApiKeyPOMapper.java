package com.steeringhub.repository.postgres.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.steeringhub.repository.postgres.po.ApiKeyPO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface ApiKeyPOMapper extends BaseMapper<ApiKeyPO> {

    ApiKeyPO findEnabledByKeyValue(@Param("keyValue") String keyValue);

    List<ApiKeyPO> findAllOrderByCreatedAtDesc();
}
