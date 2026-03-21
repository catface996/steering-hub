package com.steeringhub.steering.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.steeringhub.steering.entity.SteeringUsage;

import java.util.List;
import java.util.Map;

public interface SteeringUsageService extends IService<SteeringUsage> {

    /**
     * 记录规范使用
     */
    SteeringUsage recordUsage(Long steeringId, Long repoId, String repoName, String taskDescription, String agentId);

    /**
     * 查询某仓库使用过的规范列表
     */
    List<SteeringUsage> listByRepo(Long repoId);

    /**
     * 统计规范使用频率
     */
    List<Map<String, Object>> getUsageStats(int limit);
}
