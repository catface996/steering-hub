package com.steeringhub.application.api.service;

import com.steeringhub.application.api.dto.request.RepoCreateRequest;
import com.steeringhub.application.api.dto.request.RepoQueryRequest;
import com.steeringhub.application.api.dto.request.RepoSteeringBindRequest;
import com.steeringhub.application.api.dto.request.RepoUpdateRequest;
import com.steeringhub.application.api.dto.response.BindingResultResponse;
import com.steeringhub.application.api.dto.response.RepoItem;
import com.steeringhub.application.api.dto.response.RepoSteeringItem;
import com.steeringhub.application.api.dto.response.RepoVO;
import com.steeringhub.common.response.PageResult;

/**
 * 仓库管理应用服务
 */
public interface RepoApplicationService {

    RepoVO createRepo(RepoCreateRequest request);

    PageResult<RepoVO> listRepos(RepoQueryRequest request);

    RepoVO getRepo(Long id);

    RepoVO getByFullName(String fullName);

    RepoVO updateRepo(Long id, RepoUpdateRequest request);

    RepoVO toggleRepo(Long id);

    void deleteRepo(Long id);

    BindingResultResponse bindSteering(Long repoId, Long steeringId, RepoSteeringBindRequest request);

    void unbindSteering(Long repoId, Long steeringId);

    PageResult<RepoSteeringItem> listSteeringsByRepo(Long repoId, int page, int size);

    PageResult<RepoItem> listReposBySteering(Long steeringId, int page, int size);
}
