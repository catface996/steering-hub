package com.steeringhub.spec.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.steeringhub.spec.entity.SpecUsage;
import com.steeringhub.spec.mapper.SpecUsageMapper;
import com.steeringhub.spec.service.SpecUsageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class SpecUsageServiceImpl extends ServiceImpl<SpecUsageMapper, SpecUsage>
        implements SpecUsageService {

    @Override
    @Transactional
    public SpecUsage recordUsage(Long specId, Long repoId, String repoName,
                                 String taskDescription, String agentId) {
        SpecUsage usage = new SpecUsage();
        usage.setSpecId(specId);
        usage.setRepoId(repoId);
        usage.setRepoName(repoName);
        usage.setTaskDescription(taskDescription);
        usage.setAgentId(agentId);
        save(usage);
        return usage;
    }

    @Override
    public List<SpecUsage> listByRepo(Long repoId) {
        return baseMapper.selectByRepoId(repoId);
    }

    @Override
    public List<Map<String, Object>> getUsageStats(int limit) {
        return baseMapper.selectUsageStats(limit);
    }
}
