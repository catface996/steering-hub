package com.steeringhub.domain.service;

import com.steeringhub.domain.model.health.SimilarSpecPair;

import java.util.List;

/**
 * 健康检查领域服务：相似度计算与配对检测。
 * 纯业务规则，不含事务、不含 DTO。
 */
public interface HealthCheckDomainService {

    /**
     * 对所有 active 规范执行两两相似度比较，返回超过阈值的配对列表。
     * 会自动为缺少 content_embedding 的规范生成向量。
     */
    List<SimilarSpecPair> detectSimilarPairs(Long taskId, double similarityThreshold);
}
