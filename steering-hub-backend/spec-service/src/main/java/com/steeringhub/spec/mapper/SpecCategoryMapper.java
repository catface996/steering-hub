package com.steeringhub.spec.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.steeringhub.spec.entity.SpecCategory;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface SpecCategoryMapper extends BaseMapper<SpecCategory> {

    List<SpecCategory> selectTreeByParentId(Long parentId);
}
