package com.steeringhub.spec.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.steeringhub.common.enums.ReviewAction;
import com.steeringhub.spec.dto.request.CreateSpecRequest;
import com.steeringhub.spec.dto.request.UpdateSpecRequest;
import com.steeringhub.spec.dto.response.SpecDetailResponse;
import com.steeringhub.spec.entity.Spec;

public interface SpecService extends IService<Spec> {

    /**
     * 创建规范（初始为草稿状态）
     */
    SpecDetailResponse createSpec(CreateSpecRequest request);

    /**
     * 更新规范内容（生成新版本号）
     */
    SpecDetailResponse updateSpec(Long id, UpdateSpecRequest request);

    /**
     * 获取规范详情
     */
    SpecDetailResponse getSpecDetail(Long id);

    /**
     * 分页查询规范列表
     */
    IPage<SpecDetailResponse> pageSpecs(Page<Spec> page, Long categoryId, String status, String keyword);

    /**
     * 审核流程：提交/审核通过/驳回/生效/废弃
     */
    void reviewSpec(Long id, ReviewAction action, String comment, Long reviewerId, String reviewerName);

    /**
     * 回滚到指定历史版本
     */
    SpecDetailResponse rollbackSpec(Long id, int version);

    /**
     * 删除规范（逻辑删除）
     */
    void deleteSpec(Long id);

    /**
     * 更新规范的 embedding 向量
     */
    void updateEmbedding(Long specId, float[] embedding);
}
