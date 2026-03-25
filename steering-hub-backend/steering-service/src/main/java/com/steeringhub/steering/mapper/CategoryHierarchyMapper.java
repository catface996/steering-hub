package com.steeringhub.steering.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.steeringhub.steering.entity.CategoryHierarchy;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface CategoryHierarchyMapper extends BaseMapper<CategoryHierarchy> {

    void insertRelation(@Param("parentId") Long parentId,
                        @Param("childId") Long childId,
                        @Param("sortOrder") int sortOrder);

    void deleteRelation(@Param("parentId") Long parentId,
                        @Param("childId") Long childId);

    List<Long> selectChildIds(@Param("parentId") Long parentId);
}
