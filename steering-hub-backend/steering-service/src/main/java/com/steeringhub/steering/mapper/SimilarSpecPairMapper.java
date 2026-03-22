package com.steeringhub.steering.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.steeringhub.steering.dto.response.SimilarPairVO;
import com.steeringhub.steering.entity.SimilarSpecPair;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface SimilarSpecPairMapper extends BaseMapper<SimilarSpecPair> {

    int batchInsert(@Param("list") List<SimilarSpecPair> list);

    List<SimilarPairVO> findByTaskIdPaged(@Param("taskId") Long taskId,
                                          @Param("offset") int offset,
                                          @Param("pageSize") int pageSize,
                                          @Param("specTitle") String specTitle,
                                          @Param("categoryId") Long categoryId);

    long countByTaskIdFiltered(@Param("taskId") Long taskId,
                               @Param("specTitle") String specTitle,
                               @Param("categoryId") Long categoryId);
}
