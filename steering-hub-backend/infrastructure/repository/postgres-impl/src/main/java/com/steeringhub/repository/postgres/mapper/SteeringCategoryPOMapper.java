package com.steeringhub.repository.postgres.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.steeringhub.repository.postgres.po.SteeringCategoryPO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface SteeringCategoryPOMapper extends BaseMapper<SteeringCategoryPO> {

    List<SteeringCategoryPO> selectTreeByParentId(@Param("parentId") Long parentId);

    List<SteeringCategoryPO> selectAllEnabled();

    int countByCode(@Param("code") String code);

    SteeringCategoryPO selectByCode(@Param("code") String code);

    int countDirectChildren(@Param("categoryId") Long categoryId);
}
