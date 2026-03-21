package com.steeringhub.steering.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.steeringhub.steering.entity.StopWord;
import org.apache.ibatis.annotations.Mapper;

/**
 * 停用词 Mapper
 */
@Mapper
public interface StopWordMapper extends BaseMapper<StopWord> {
}
