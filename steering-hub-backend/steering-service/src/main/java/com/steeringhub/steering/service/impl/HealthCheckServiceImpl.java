package com.steeringhub.steering.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.steeringhub.common.exception.BusinessException;
import com.steeringhub.common.response.PageResult;
import com.steeringhub.common.response.ResultCode;
import com.steeringhub.steering.dto.response.HealthCheckTaskVO;
import com.steeringhub.steering.dto.response.SimilarPairVO;
import com.steeringhub.steering.dto.response.TriggerVO;
import com.steeringhub.steering.entity.HealthCheckTask;
import com.steeringhub.steering.entity.SimilarSpecPair;
import com.steeringhub.steering.entity.Steering;
import com.steeringhub.steering.mapper.HealthCheckTaskMapper;
import com.steeringhub.steering.mapper.SimilarSpecPairMapper;
import com.steeringhub.steering.mapper.SteeringMapper;
import com.steeringhub.steering.service.HealthCheckService;
import com.steeringhub.steering.service.SteeringService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class HealthCheckServiceImpl implements HealthCheckService {

    private final HealthCheckTaskMapper healthCheckTaskMapper;
    private final SimilarSpecPairMapper similarSpecPairMapper;
    private final SteeringMapper steeringMapper;
    private final SteeringService steeringService;
    private final org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor healthCheckExecutor;

    private static final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${health-check.similarity-threshold:0.7}")
    private double similarityThreshold;

    @Value("${health-check.sse-timeout-ms:300000}")
    private long sseTimeoutMs;

    private final CopyOnWriteArrayList<SseEmitter> emitters = new CopyOnWriteArrayList<>();
    private final ScheduledExecutorService heartbeatScheduler = Executors.newSingleThreadScheduledExecutor();

    @PostConstruct
    public void startHeartbeat() {
        heartbeatScheduler.scheduleAtFixedRate(() -> {
            List<SseEmitter> dead = new ArrayList<>();
            for (SseEmitter emitter : emitters) {
                try {
                    emitter.send(SseEmitter.event().name("heartbeat").data("{}"));
                } catch (Exception e) {
                    dead.add(emitter);
                }
            }
            emitters.removeAll(dead);
        }, 30, 30, TimeUnit.SECONDS);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public TriggerVO triggerCheck() {
        HealthCheckTask running = healthCheckTaskMapper.findRunning();
        if (running != null) {
            throw new BusinessException(ResultCode.TASK_ALREADY_RUNNING);
        }

        int activeCount = steeringMapper.countActiveSpecs();
        if (activeCount < 2) {
            throw new BusinessException(ResultCode.SPEC_COUNT_INSUFFICIENT.getCode(),
                    "规范数量不足，无需检测（当前 active 规范 " + activeCount + " 条）");
        }

        HealthCheckTask task = new HealthCheckTask();
        task.setStatus("running");
        task.setSimilarPairCount(0);
        task.setActiveSpecCount(activeCount);
        healthCheckTaskMapper.insertAndGetId(task);

        final Long taskId = task.getId();
        final int specCount = (int) activeCount;
        healthCheckExecutor.submit(() -> runCheckAsync(taskId, specCount));

        TriggerVO vo = new TriggerVO();
        vo.setTaskId(taskId);
        vo.setStatus("running");
        return vo;
    }

    public void runCheckAsync(Long taskId, int activeSpecCount) {
        try {
            // 1. Load all active specs with embeddings
            List<Steering> activeSpecs = steeringMapper.findAllActiveWithEmbedding();

            // 2. Batch-generate content_embedding for specs where it is NULL
            List<Long> withEmbedding = steeringMapper.findActiveSpecIdsWithEmbedding();
            Set<Long> withEmbeddingSet = new HashSet<>(withEmbedding);

            for (Steering spec : activeSpecs) {
                if (!withEmbeddingSet.contains(spec.getId())) {
                    try {
                        steeringService.generateContentEmbedding(spec.getId());
                    } catch (Exception e) {
                        log.warn("Failed to generate content_embedding for spec {}: {}", spec.getId(), e.getMessage());
                    }
                }
            }

            // 3. Collect unique pairs with score >= threshold
            Set<String> seenPairs = new HashSet<>();
            List<SimilarSpecPair> pairs = new ArrayList<>();

            // Re-query spec IDs that now have embeddings
            List<Long> specsWithEmbedding = steeringMapper.findActiveSpecIdsWithEmbedding();

            for (Long specId : specsWithEmbedding) {
                List<Steering> similar = steeringMapper.findTopKSimilarBySpecId(specId, 10);

                for (Steering candidate : similar) {
                    double score = candidate.getSimilarityScore() != null ? candidate.getSimilarityScore() : 0.0;
                    if (score < similarityThreshold) continue;

                    long aId = Math.min(specId, candidate.getId());
                    long bId = Math.max(specId, candidate.getId());
                    String key = aId + "-" + bId;
                    if (seenPairs.contains(key)) continue;
                    seenPairs.add(key);

                    SimilarSpecPair pair = new SimilarSpecPair();
                    pair.setTaskId(taskId);
                    pair.setSpecAId(aId);
                    pair.setSpecBId(bId);
                    pair.setOverallScore(BigDecimal.valueOf(score).setScale(3, RoundingMode.HALF_UP));
                    pair.setVectorScore(BigDecimal.valueOf(score).setScale(3, RoundingMode.HALF_UP));
                    pair.setTitleScore(null);
                    pair.setTagsScore(null);
                    pair.setKeywordsScore(null);
                    pair.setReasonTags("[\"内容语义相近\"]");
                    pairs.add(pair);
                }
            }

            // 4. Batch insert pairs
            if (!pairs.isEmpty()) {
                similarSpecPairMapper.batchInsert(pairs);
            }

            // 5. Update task to completed
            healthCheckTaskMapper.updateStatus(taskId, "completed", OffsetDateTime.now(), pairs.size(), null);

            // 6. Emit SSE task-completed
            Map<String, Object> eventData = new HashMap<>();
            eventData.put("taskId", taskId);
            eventData.put("similarPairCount", pairs.size());
            eventData.put("activeSpecCount", activeSpecCount);
            broadcastEvent("task-completed", objectMapper.writeValueAsString(eventData));

        } catch (Exception e) {
            log.error("Health check task {} failed", taskId, e);
            try {
                healthCheckTaskMapper.updateStatus(taskId, "failed", OffsetDateTime.now(), 0, e.getMessage());
                Map<String, Object> eventData = new HashMap<>();
                eventData.put("taskId", taskId);
                eventData.put("errorMessage", e.getMessage());
                broadcastEvent("task-failed", objectMapper.writeValueAsString(eventData));
            } catch (Exception ex) {
                log.error("Failed to update task status after failure", ex);
            }
        }
    }

    private void broadcastEvent(String eventName, String data) {
        List<SseEmitter> dead = new ArrayList<>();
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name(eventName).data(data));
            } catch (IOException e) {
                dead.add(emitter);
            }
        }
        emitters.removeAll(dead);
    }

    @Override
    public SseEmitter subscribeEvents() {
        SseEmitter emitter = new SseEmitter(sseTimeoutMs);
        emitters.add(emitter);
        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> emitters.remove(emitter));
        emitter.onError(e -> emitters.remove(emitter));
        return emitter;
    }

    @Override
    public Optional<HealthCheckTaskVO> getLatestTask() {
        HealthCheckTask task = healthCheckTaskMapper.findLatestCompleted();
        if (task == null) return Optional.empty();

        HealthCheckTaskVO vo = new HealthCheckTaskVO();
        vo.setTaskId(task.getId());
        vo.setStatus(task.getStatus());
        vo.setSimilarPairCount(task.getSimilarPairCount());
        vo.setActiveSpecCount(task.getActiveSpecCount());
        vo.setStartedAt(task.getStartedAt());
        vo.setCompletedAt(task.getCompletedAt());
        boolean isExpired = task.getCompletedAt() != null
                && task.getCompletedAt().isBefore(OffsetDateTime.now().minusHours(24));
        vo.setIsExpired(isExpired);
        return Optional.of(vo);
    }

    @Override
    public PageResult<SimilarPairVO> getSimilarPairs(Long taskId, int page, int pageSize, String specTitle, Long categoryId) {
        int offset = (page - 1) * pageSize;
        String titleParam = (specTitle != null && !specTitle.isBlank()) ? specTitle.trim() : null;
        List<SimilarPairVO> records = similarSpecPairMapper.findByTaskIdPaged(taskId, offset, pageSize, titleParam, categoryId);
        long total = similarSpecPairMapper.countByTaskIdFiltered(taskId, titleParam, categoryId);
        return PageResult.of(records, total, page, pageSize);
    }

    @Override
    public void dismissPair(Long pairId) {
        similarSpecPairMapper.deleteById(pairId);
    }
}
