package com.steeringhub.spec.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.steeringhub.spec.entity.Repo;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface RepoMapper extends BaseMapper<Repo> {
}
