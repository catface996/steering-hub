package com.steeringhub.repository.postgres.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.steeringhub.repository.postgres.po.CategoryHierarchyPO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface CategoryHierarchyPOMapper extends BaseMapper<CategoryHierarchyPO> {

    void insertRelation(@Param("parentId") Long parentId,
                        @Param("childId") Long childId,
                        @Param("sortOrder") int sortOrder);

    void deleteRelation(@Param("parentId") Long parentId,
                        @Param("childId") Long childId);

    List<Long> selectChildIds(@Param("parentId") Long parentId);

    List<Long> selectAllDescendantIds(@Param("rootId") Long rootId);
}
