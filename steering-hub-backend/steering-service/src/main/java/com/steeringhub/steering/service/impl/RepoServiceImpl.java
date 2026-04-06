package com.steeringhub.steering.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.steeringhub.domain.model.steering.SteeringStatus;
import com.steeringhub.common.exception.BusinessException;
import com.steeringhub.common.response.PageResult;
import com.steeringhub.steering.dto.request.RepoCreateRequest;
import com.steeringhub.steering.dto.request.RepoQueryRequest;
import com.steeringhub.steering.dto.request.RepoSteeringBindRequest;
import com.steeringhub.steering.dto.request.RepoUpdateRequest;
import com.steeringhub.steering.dto.response.BindingResultResponse;
import com.steeringhub.steering.dto.response.RepoItem;
import com.steeringhub.steering.dto.response.RepoSteeringItem;
import com.steeringhub.steering.entity.Repo;
import com.steeringhub.steering.entity.RepoSteering;
import com.steeringhub.steering.entity.Steering;
import com.steeringhub.steering.mapper.RepoMapper;
import com.steeringhub.steering.mapper.RepoSteeringMapper;
import com.steeringhub.steering.mapper.SteeringMapper;
import com.steeringhub.steering.service.RepoService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RepoServiceImpl extends ServiceImpl<RepoMapper, Repo> implements RepoService {

    private final RepoSteeringMapper repoSteeringMapper;
    private final SteeringMapper steeringMapper;

    @Override
    @Transactional
    public Repo registerRepo(String name, String fullName, String description,
                             String url, String language, String team) {
        Repo existing = getByFullName(fullName);
        if (existing != null) {
            return existing;
        }
        Repo repo = new Repo();
        repo.setName(name);
        repo.setFullName(fullName);
        repo.setDescription(description);
        repo.setUrl(url);
        repo.setLanguage(language);
        repo.setTeam(team);
        repo.setEnabled(true);
        save(repo);
        return repo;
    }

    @Override
    public Repo getByFullName(String fullName) {
        return baseMapper.findEnabledByFullName(fullName);
    }

    @Override
    @Transactional
    public Repo createRepo(RepoCreateRequest request) {
        Repo existing = baseMapper.findByFullNameIncludeDeleted(request.getFullName());
        if (existing != null) {
            throw new BusinessException(409, "仓库 full_name 已存在: " + request.getFullName());
        }
        Repo repo = new Repo();
        repo.setName(request.getName());
        repo.setFullName(request.getFullName());
        repo.setDescription(request.getDescription());
        repo.setUrl(request.getUrl());
        repo.setLanguage(request.getLanguage());
        repo.setTeam(request.getTeam());
        repo.setEnabled(true);
        save(repo);
        return repo;
    }

    @Override
    public PageResult<Repo> listRepos(RepoQueryRequest request) {
        int offset = (request.getPage() - 1) * request.getSize();
        List<Repo> records = baseMapper.listByCondition(
                request.getName(), request.getTeam(), request.getEnabled(),
                offset, request.getSize());
        long total = baseMapper.countByCondition(
                request.getName(), request.getTeam(), request.getEnabled());
        return PageResult.of(records, total, request.getPage(), request.getSize());
    }

    @Override
    public Repo getRepo(Long id) {
        Repo repo = getById(id);
        if (repo == null) {
            throw new BusinessException(404, "仓库不存在");
        }
        return repo;
    }

    @Override
    @Transactional
    public Repo updateRepo(Long id, RepoUpdateRequest request) {
        Repo repo = getRepo(id);
        repo.setName(request.getName());
        repo.setDescription(request.getDescription());
        repo.setUrl(request.getUrl());
        repo.setLanguage(request.getLanguage());
        repo.setTeam(request.getTeam());
        updateById(repo);
        return getById(id);
    }

    @Override
    @Transactional
    public Repo toggleRepo(Long id) {
        Repo repo = getRepo(id);
        repo.setEnabled(!repo.getEnabled());
        updateById(repo);
        return repo;
    }

    @Override
    @Transactional
    public void deleteRepo(Long id) {
        getRepo(id);
        repoSteeringMapper.deleteByRepoId(id);
        removeById(id);
    }

    @Override
    @Transactional
    public BindingResultResponse bindSteering(Long repoId, Long steeringId, RepoSteeringBindRequest request) {
        getRepo(repoId);
        Steering steering = steeringMapper.selectById(steeringId);
        if (steering == null) {
            throw new BusinessException(404, "规范不存在");
        }
        boolean mandatory = request.getMandatory() != null && request.getMandatory();
        repoSteeringMapper.upsertBinding(repoId, steeringId, mandatory);
        RepoSteering binding = repoSteeringMapper.findByPair(repoId, steeringId);

        BindingResultResponse response = new BindingResultResponse();
        response.setBindingId(binding.getId());
        response.setRepoId(repoId);
        response.setSteeringId(steeringId);
        response.setMandatory(mandatory);
        if (steering.getStatus() != SteeringStatus.ACTIVE) {
            response.setWarning("规范当前状态为 " + steering.getStatus().getCode() + "，不参与 MCP 搜索 boost");
        }
        return response;
    }

    @Override
    @Transactional
    public void unbindSteering(Long repoId, Long steeringId) {
        int deleted = repoSteeringMapper.deleteByPair(repoId, steeringId);
        if (deleted == 0) {
            throw new BusinessException(404, "绑定关系不存在");
        }
    }

    @Override
    public PageResult<RepoSteeringItem> listSteeringsByRepo(Long repoId, int page, int size) {
        int offset = (page - 1) * size;
        List<RepoSteeringItem> records = repoSteeringMapper.listByRepoIdPaged(repoId, offset, size);
        long total = repoSteeringMapper.countByRepoId(repoId);
        return PageResult.of(records, total, page, size);
    }

    @Override
    public PageResult<RepoItem> listReposBySteering(Long steeringId, int page, int size) {
        int offset = (page - 1) * size;
        List<RepoItem> records = repoSteeringMapper.listBySteeringIdPaged(steeringId, offset, size);
        long total = repoSteeringMapper.countBySteeringId(steeringId);
        return PageResult.of(records, total, page, size);
    }
}
