package com.steeringhub.domain.service;

import com.steeringhub.domain.model.steering.ReviewAction;
import com.steeringhub.domain.model.steering.Steering;
import com.steeringhub.domain.model.steering.SteeringVersion;

/**
 * 审批状态机：管理 Steering 生命周期状态流转。
 * 纯业务规则，不含事务、不含 DTO。
 */
public interface SteeringDomainService {

    /**
     * 执行审批动作（submit/approve/reject/activate/deprecate/withdraw）。
     * 校验当前状态是否允许该动作，执行状态流转并持久化。
     */
    void executeReview(Long steeringId, ReviewAction action, String comment, Long reviewerId);

    /**
     * 校验 Steering 是否可删除（仅 DRAFT / DEPRECATED 允许）。
     */
    void validateDeletion(Steering steering);

    /**
     * 校验 Steering 是否可编辑（PENDING_REVIEW 不允许；已有 pending_review 版本不允许）。
     */
    void validateEditable(Steering steering);

    /**
     * 过滤关键词：移除停用词，限制最多 15 个。
     */
    String sanitizeKeywords(String keywords);

    /**
     * 去除 Markdown 格式，返回纯文本（用于 embedding 输入）。
     */
    String stripMarkdown(String content);
}
