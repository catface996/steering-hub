package com.steeringhub.application.api.service;

import com.steeringhub.application.api.dto.response.HealthCheckTaskVO;
import com.steeringhub.application.api.dto.response.SimilarPairVO;
import com.steeringhub.application.api.dto.response.TriggerVO;
import com.steeringhub.common.response.PageResult;

import java.util.Optional;

/**
 * 健康检查 + 相似对查询应用服务
 */
public interface HealthCheckApplicationService {

    TriggerVO triggerCheck();

    Optional<HealthCheckTaskVO> getLatestTask();

    PageResult<SimilarPairVO> getSimilarPairs(Long taskId, int page, int pageSize, String specTitle, Long categoryId);

    void dismissPair(Long pairId);
}
