package com.steeringhub.steering.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.steeringhub.domain.model.steering.ReviewAction;
import com.steeringhub.steering.dto.request.CreateSteeringRequest;
import com.steeringhub.steering.dto.request.UpdateSteeringRequest;
import com.steeringhub.steering.dto.response.SteeringDetailResponse;
import com.steeringhub.steering.dto.response.SteeringVersionDetailVO;
import com.steeringhub.steering.dto.response.SteeringVersionVO;
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

    /**
     * 分页查询版本历史列表
     */
    IPage<SteeringVersionVO> listVersions(Long id, long current, long size);

    /**
     * 获取指定版本详情（只读）
     */
    SteeringVersionDetailVO getVersionDetail(Long id, int versionNumber);

    /**
     * 审批队列：查询所有含 pending_review 版本的规范（分页）
     */
    IPage<com.steeringhub.steering.dto.response.ReviewQueueItemVO> listReviewQueue(long current, long size);

    /**
     * 版本对比：返回当前 active 版本与待审版本的内容快照
     */
    com.steeringhub.steering.dto.response.DiffVO getVersionDiff(Long steeringId);

    /**
     * 删除指定规范的草稿版本
     */
    void deleteDraftVersion(Long steeringId, int versionNumber);
}
