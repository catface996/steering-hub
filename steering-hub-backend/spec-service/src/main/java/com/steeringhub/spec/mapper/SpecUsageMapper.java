package com.steeringhub.spec.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.steeringhub.spec.entity.SpecUsage;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Map;

@Mapper
public interface SpecUsageMapper extends BaseMapper<SpecUsage> {

    List<SpecUsage> selectByRepoId(@Param("repoId") Long repoId);

    List<SpecUsage> selectBySpecId(@Param("specId") Long specId);

    /**
     * 统计规范使用频率（Top N）
     */
    List<Map<String, Object>> selectUsageStats(@Param("limit") int limit);
}
