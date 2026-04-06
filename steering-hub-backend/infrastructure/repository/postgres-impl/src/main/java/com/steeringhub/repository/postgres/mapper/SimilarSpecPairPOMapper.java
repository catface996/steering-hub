package com.steeringhub.repository.postgres.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.steeringhub.repository.postgres.po.SimilarSpecPairPO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface SimilarSpecPairPOMapper extends BaseMapper<SimilarSpecPairPO> {

    int batchInsert(@Param("list") List<SimilarSpecPairPO> list);

    List<SimilarSpecPairPO> findByTaskIdPaged(@Param("taskId") Long taskId,
                                               @Param("offset") int offset,
                                               @Param("pageSize") int pageSize,
                                               @Param("specTitle") String specTitle,
                                               @Param("categoryId") Long categoryId);

    long countByTaskIdFiltered(@Param("taskId") Long taskId,
                               @Param("specTitle") String specTitle,
                               @Param("categoryId") Long categoryId);
}
