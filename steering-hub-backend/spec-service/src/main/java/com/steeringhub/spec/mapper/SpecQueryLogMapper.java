package com.steeringhub.spec.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.steeringhub.spec.entity.SpecQueryLog;
import org.apache.ibatis.annotations.Mapper;

/**
 * 规范查询日志Mapper
 */
@Mapper
public interface SpecQueryLogMapper extends BaseMapper<SpecQueryLog> {
}
