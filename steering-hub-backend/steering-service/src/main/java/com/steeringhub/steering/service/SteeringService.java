package com.steeringhub.steering.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.steeringhub.common.enums.ReviewAction;
import com.steeringhub.steering.dto.request.CreateSteeringRequest;
import com.steeringhub.steering.dto.request.UpdateSteeringRequest;
import com.steeringhub.steering.dto.response.SteeringDetailResponse;
import com.steeringhub.steering.entity.Steering;

public interface SteeringService extends IService<Steering> {

    /**
     * 创建规范（初始为草稿状态）
     */
    SteeringDetailResponse createSteering(CreateSteeringRequest request);

    /**
     * 更新规范内容（生成新版本号）
     */
    SteeringDetailResponse updateSteering(Long id, UpdateSteeringRequest request);

    /**
     * 获取规范详情
     */
    SteeringDetailResponse getSteeringDetail(Long id);

    /**
     * 分页查询规范列表
     */
    IPage<SteeringDetailResponse> pageSteerings(Page<Steering> page, Long categoryId, String status, String keyword);

    /**
     * 审核流程：提交/审核通过/驳回/生效/废弃
     */
    void reviewSteering(Long id, ReviewAction action, String comment, Long reviewerId, String reviewerName);

    /**
     * 回滚到指定历史版本
     */
    SteeringDetailResponse rollbackSteering(Long id, int version);

    /**
     * 删除规范（逻辑删除）
     */
    void deleteSteering(Long id);

    /**
     * 更新规范的 embedding 向量
     */
    void updateEmbedding(Long steeringId, float[] embedding);

    /**
     * 对规范 content 字段生成 content_embedding 并写入数据库
     */
    void generateContentEmbedding(Long id);
}
