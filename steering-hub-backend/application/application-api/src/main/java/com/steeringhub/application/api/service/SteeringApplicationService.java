package com.steeringhub.application.api.service;

import com.steeringhub.application.api.dto.request.CreateSteeringRequest;
import com.steeringhub.application.api.dto.request.ReviewSteeringRequest;
import com.steeringhub.application.api.dto.request.UpdateSteeringRequest;
import com.steeringhub.application.api.dto.response.DiffVO;
import com.steeringhub.application.api.dto.response.ReviewQueueItemVO;
import com.steeringhub.application.api.dto.response.SteeringDetailResponse;
import com.steeringhub.application.api.dto.response.SteeringVersionDetailVO;
import com.steeringhub.application.api.dto.response.SteeringVersionVO;
import com.steeringhub.common.response.PageResult;

/**
 * 规范管理应用服务：CRUD + 搜索 + 审批 + 版本管理
 */
public interface SteeringApplicationService {

    SteeringDetailResponse createSteering(CreateSteeringRequest request);

    SteeringDetailResponse updateSteering(Long id, UpdateSteeringRequest request);

    SteeringDetailResponse getSteeringDetail(Long id);

    PageResult<SteeringDetailResponse> pageSteerings(int page, int size, Long categoryId, String status, String keyword);

    void reviewSteering(Long id, ReviewSteeringRequest request, Long reviewerId, String reviewerName);

    SteeringDetailResponse rollbackSteering(Long id, int version);

    void deleteSteering(Long id);

    PageResult<SteeringVersionVO> listVersions(Long id, int page, int size);

    SteeringVersionDetailVO getVersionDetail(Long id, int versionNumber);

    void deleteDraftVersion(Long steeringId, int versionNumber);

    PageResult<ReviewQueueItemVO> listReviewQueue(int page, int size);

    DiffVO getVersionDiff(Long steeringId);
}
