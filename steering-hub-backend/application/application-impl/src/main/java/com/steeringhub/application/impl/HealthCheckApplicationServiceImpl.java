package com.steeringhub.application.impl;

import com.steeringhub.application.api.dto.response.HealthCheckTaskVO;
import com.steeringhub.application.api.dto.response.SimilarPairVO;
import com.steeringhub.application.api.dto.response.SimilarSpecInfoVO;
import com.steeringhub.application.api.dto.response.TriggerVO;
import com.steeringhub.application.api.service.HealthCheckApplicationService;
import com.steeringhub.common.exception.BusinessException;
import com.steeringhub.common.response.PageResult;
import com.steeringhub.common.response.ResultCode;
import com.steeringhub.domain.model.health.HealthCheckTask;
import com.steeringhub.domain.model.health.SimilarSpecPair;
import com.steeringhub.domain.model.steering.Steering;
import com.steeringhub.domain.service.HealthCheckDomainService;
import com.steeringhub.repository.CategoryRepository;
import com.steeringhub.repository.HealthCheckTaskRepository;
import com.steeringhub.repository.SimilarSpecPairRepository;
import com.steeringhub.repository.SteeringRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class HealthCheckApplicationServiceImpl implements HealthCheckApplicationService {

    private final HealthCheckDomainService healthCheckDomainService;
    private final HealthCheckTaskRepository healthCheckTaskRepository;
    private final SimilarSpecPairRepository similarSpecPairRepository;
    private final SteeringRepository steeringRepository;
    private final CategoryRepository categoryRepository;

    @Value("${health-check.similarity-threshold:0.7}")
    private double similarityThreshold;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public TriggerVO triggerCheck() {
        log.info("triggerCheck start");

        HealthCheckTask running = healthCheckTaskRepository.findRunning();
        if (running != null) {
            throw new BusinessException(ResultCode.TASK_ALREADY_RUNNING);
        }

        int activeCount = steeringRepository.countActiveSpecs();
        if (activeCount < 2) {
            throw new BusinessException(ResultCode.SPEC_COUNT_INSUFFICIENT.getCode(),
                    "规范数量不足，无需检测（当前 active 规范 " + activeCount + " 条）");
        }

        HealthCheckTask task = new HealthCheckTask();
        task.setStatus("running");
        task.setSimilarPairCount(0);
        task.setActiveSpecCount(activeCount);
        healthCheckTaskRepository.save(task);

        runCheckAsync(task.getId());

        TriggerVO vo = new TriggerVO();
        vo.setTaskId(task.getId());
        vo.setStatus("running");
        log.info("triggerCheck success taskId={}", task.getId());
        return vo;
    }

    @Async
    public void runCheckAsync(Long taskId) {
        try {
            List<SimilarSpecPair> pairs = healthCheckDomainService.detectSimilarPairs(taskId, similarityThreshold);
            if (!pairs.isEmpty()) {
                similarSpecPairRepository.batchSave(pairs);
            }

            HealthCheckTask task = new HealthCheckTask();
            task.setId(taskId);
            task.setStatus("completed");
            task.setCompletedAt(OffsetDateTime.now());
            task.setSimilarPairCount(pairs.size());
            healthCheckTaskRepository.update(task);

            log.info("runCheckAsync completed taskId={} pairCount={}", taskId, pairs.size());
        } catch (Exception e) {
            log.error("Health check task {} failed", taskId, e);
            HealthCheckTask task = new HealthCheckTask();
            task.setId(taskId);
            task.setStatus("failed");
            task.setCompletedAt(OffsetDateTime.now());
            task.setSimilarPairCount(0);
            task.setErrorMessage(e.getMessage());
            healthCheckTaskRepository.update(task);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<HealthCheckTaskVO> getLatestTask() {
        log.info("getLatestTask start");
        HealthCheckTask task = healthCheckTaskRepository.findLatestCompleted();
        if (task == null) {
            return Optional.empty();
        }

        HealthCheckTaskVO vo = new HealthCheckTaskVO();
        vo.setTaskId(task.getId());
        vo.setStatus(task.getStatus());
        vo.setSimilarPairCount(task.getSimilarPairCount());
        vo.setActiveSpecCount(task.getActiveSpecCount());
        vo.setStartedAt(task.getStartedAt());
        vo.setCompletedAt(task.getCompletedAt());
        vo.setIsExpired(task.getCompletedAt() != null
                && task.getCompletedAt().isBefore(OffsetDateTime.now().minusHours(24)));
        return Optional.of(vo);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResult<SimilarPairVO> getSimilarPairs(Long taskId, int page, int pageSize, String specTitle, Long categoryId) {
        log.info("getSimilarPairs taskId={} page={} pageSize={}", taskId, page, pageSize);
        int offset = (page - 1) * pageSize;
        String titleParam = (specTitle != null && !specTitle.isBlank()) ? specTitle.trim() : null;

        List<SimilarSpecPair> pairs = similarSpecPairRepository.findByTaskIdPaged(taskId, offset, pageSize, titleParam, categoryId);
        long total = similarSpecPairRepository.countByTaskIdFiltered(taskId, titleParam, categoryId);

        List<SimilarPairVO> voList = pairs.stream().map(this::toSimilarPairVO).collect(Collectors.toList());
        return PageResult.of(voList, total, page, pageSize);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void dismissPair(Long pairId) {
        log.info("dismissPair pairId={}", pairId);
        similarSpecPairRepository.deleteById(pairId);
    }

    private SimilarPairVO toSimilarPairVO(SimilarSpecPair pair) {
        SimilarPairVO vo = new SimilarPairVO();
        vo.setId(pair.getId());
        vo.setOverallScore(pair.getOverallScore());
        vo.setVectorScore(pair.getVectorScore());
        vo.setTitleScore(pair.getTitleScore());
        vo.setTagsScore(pair.getTagsScore());
        vo.setKeywordsScore(pair.getKeywordsScore());
        if (pair.getReasonTags() != null) {
            vo.setReasonTags(Arrays.asList(pair.getReasonTags().replaceAll("[\\[\\]\"]", "").split(",")));
        }
        vo.setSpecA(toSpecInfoVO(pair.getSpecAId()));
        vo.setSpecB(toSpecInfoVO(pair.getSpecBId()));
        return vo;
    }

    private SimilarSpecInfoVO toSpecInfoVO(Long specId) {
        SimilarSpecInfoVO info = new SimilarSpecInfoVO();
        info.setId(specId);
        Steering s = steeringRepository.getById(specId);
        if (s != null) {
            info.setTitle(s.getTitle());
            info.setTags(s.getTags());
            info.setStatus(s.getStatus() != null ? s.getStatus().getCode() : null);
            info.setCategoryId(s.getCategoryId());
            if (s.getCategoryId() != null) {
                var cat = categoryRepository.getById(s.getCategoryId());
                if (cat != null) {
                    info.setCategoryName(cat.getName());
                }
            }
        }
        return info;
    }
}
