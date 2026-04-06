package com.steeringhub.repository.postgres.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.steeringhub.repository.postgres.po.ComplianceReportPO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface ComplianceReportPOMapper extends BaseMapper<ComplianceReportPO> {

    List<ComplianceReportPO> findByRepoId(@Param("repoId") Long repoId, @Param("limit") int limit);
}
