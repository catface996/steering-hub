package com.steeringhub.steering.service;

import com.steeringhub.common.response.PageResult;
import com.steeringhub.steering.dto.response.HealthCheckTaskVO;
import com.steeringhub.steering.dto.response.SimilarPairVO;
import com.steeringhub.steering.dto.response.TriggerVO;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Optional;

public interface HealthCheckService {

    TriggerVO triggerCheck();

    SseEmitter subscribeEvents();

    Optional<HealthCheckTaskVO> getLatestTask();

    PageResult<SimilarPairVO> getSimilarPairs(Long taskId, int page, int pageSize, String specTitle, Long categoryId);

    void dismissPair(Long pairId);
}
