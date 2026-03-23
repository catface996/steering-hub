package com.steeringhub.steering.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.steeringhub.common.response.PageResult;
import com.steeringhub.steering.dto.request.RepoCreateRequest;
import com.steeringhub.steering.dto.request.RepoQueryRequest;
import com.steeringhub.steering.dto.request.RepoSteeringBindRequest;
import com.steeringhub.steering.dto.request.RepoUpdateRequest;
import com.steeringhub.steering.dto.response.BindingResultResponse;
import com.steeringhub.steering.dto.response.RepoItem;
import com.steeringhub.steering.dto.response.RepoSteeringItem;
import com.steeringhub.steering.entity.Repo;

public interface RepoService extends IService<Repo> {

    // Legacy method kept for MCP usage tracking
    Repo registerRepo(String name, String fullName, String description, String url, String language, String team);

    Repo getByFullName(String fullName);

    // CRUD
    Repo createRepo(RepoCreateRequest request);

    PageResult<Repo> listRepos(RepoQueryRequest request);

    Repo getRepo(Long id);

    Repo updateRepo(Long id, RepoUpdateRequest request);

    Repo toggleRepo(Long id);

    void deleteRepo(Long id);

    // Binding
    BindingResultResponse bindSteering(Long repoId, Long steeringId, RepoSteeringBindRequest request);

    void unbindSteering(Long repoId, Long steeringId);

    PageResult<RepoSteeringItem> listSteeringsByRepo(Long repoId, int page, int size);

    PageResult<RepoItem> listReposBySteering(Long steeringId, int page, int size);
}
