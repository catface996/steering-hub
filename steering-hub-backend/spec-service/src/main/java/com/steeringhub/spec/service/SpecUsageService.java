package com.steeringhub.spec.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.steeringhub.spec.entity.SpecUsage;

import java.util.List;
import java.util.Map;

public interface SpecUsageService extends IService<SpecUsage> {

    /**
     * 记录规范使用
     */
    SpecUsage recordUsage(Long specId, Long repoId, String repoName, String taskDescription, String agentId);

    /**
     * 查询某仓库使用过的规范列表
     */
    List<SpecUsage> listByRepo(Long repoId);

    /**
     * 统计规范使用频率
     */
    List<Map<String, Object>> getUsageStats(int limit);
}
