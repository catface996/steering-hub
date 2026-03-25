package com.steeringhub.steering.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.steeringhub.steering.dto.response.CategoryNavItem;
import com.steeringhub.steering.entity.SteeringCategory;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface SteeringCategoryMapper extends BaseMapper<SteeringCategory> {

    List<SteeringCategory> selectTreeByParentId(@Param("parentId") Long parentId);

    List<CategoryNavItem> listTopLevel();

    List<CategoryNavItem> listChildren(@Param("parentId") Long parentId);
}
