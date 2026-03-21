package com.steeringhub.steering.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.steeringhub.steering.entity.SteeringUsage;
import com.steeringhub.steering.mapper.SteeringUsageMapper;
import com.steeringhub.steering.service.SteeringUsageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class SteeringUsageServiceImpl extends ServiceImpl<SteeringUsageMapper, SteeringUsage>
        implements SteeringUsageService {

    @Override
    @Transactional
    public SteeringUsage recordUsage(Long steeringId, Long repoId, String repoName,
                                 String taskDescription, String agentId) {
        SteeringUsage usage = new SteeringUsage();
        usage.setSteeringId(steeringId);
        usage.setRepoId(repoId);
        usage.setRepoName(repoName);
        usage.setTaskDescription(taskDescription);
        usage.setAgentId(agentId);
        save(usage);
        return usage;
    }

    @Override
    public List<SteeringUsage> listByRepo(Long repoId) {
        return baseMapper.selectByRepoId(repoId);
    }

    @Override
    public List<Map<String, Object>> getUsageStats(int limit) {
        return baseMapper.selectUsageStats(limit);
    }
}
