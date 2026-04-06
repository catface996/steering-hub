package com.steeringhub.repository.postgres.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.steeringhub.repository.postgres.po.StopWordPO;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface StopWordPOMapper extends BaseMapper<StopWordPO> {

    List<StopWordPO> findAllEnabled();

    List<StopWordPO> findAllOrderByWord();
}
