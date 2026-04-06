package com.steeringhub.application.impl;

import com.steeringhub.application.api.dto.request.RepoCreateRequest;
import com.steeringhub.application.api.dto.request.RepoQueryRequest;
import com.steeringhub.application.api.dto.request.RepoSteeringBindRequest;
import com.steeringhub.application.api.dto.request.RepoUpdateRequest;
import com.steeringhub.application.api.dto.response.BindingResultResponse;
import com.steeringhub.application.api.dto.response.RepoItem;
import com.steeringhub.application.api.dto.response.RepoSteeringItem;
import com.steeringhub.application.api.dto.response.RepoVO;
import com.steeringhub.application.api.service.RepoApplicationService;
import com.steeringhub.common.exception.BusinessException;
import com.steeringhub.common.response.PageResult;
import com.steeringhub.domain.model.repo.Repo;
import com.steeringhub.domain.model.repo.RepoSteering;
import com.steeringhub.domain.model.steering.Steering;
import com.steeringhub.repository.RepoRepository;
import com.steeringhub.repository.RepoSteeringRepository;
import com.steeringhub.repository.SteeringRepository;
import com.steeringhub.repository.query.RepoQuery;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RepoApplicationServiceImpl implements RepoApplicationService {

    private final RepoRepository repoRepository;
    private final RepoSteeringRepository repoSteeringRepository;
    private final SteeringRepository steeringRepository;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public RepoVO createRepo(RepoCreateRequest request) {
        log.info("createRepo fullName={}", request.getFullName());

        Repo existing = repoRepository.findByFullNameIncludeDeleted(request.getFullName());
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
        repoRepository.save(repo);

        log.info("createRepo success id={}", repo.getId());
        return toRepoVO(repo);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResult<RepoVO> listRepos(RepoQueryRequest request) {
        RepoQuery query = new RepoQuery();
        query.setName(request.getName());
        query.setTeam(request.getTeam());
        query.setEnabled(request.getEnabled());

        PageResult<Repo> result = repoRepository.page(query, request.getPage(), request.getSize());
        List<RepoVO> voList = result.getRecords().stream()
                .map(this::toRepoVO)
                .collect(Collectors.toList());
        return PageResult.of(voList, result.getTotal(), request.getPage(), request.getSize());
    }

    @Override
    @Transactional(readOnly = true)
    public RepoVO getRepo(Long id) {
        return toRepoVO(getRepoOrThrow(id));
    }

    @Override
    @Transactional(readOnly = true)
    public RepoVO getByFullName(String fullName) {
        Repo repo = repoRepository.findEnabledByFullName(fullName);
        if (repo == null) {
            throw new BusinessException(404, "仓库不存在: " + fullName);
        }
        return toRepoVO(repo);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public RepoVO updateRepo(Long id, RepoUpdateRequest request) {
        log.info("updateRepo id={}", id);
        Repo repo = getRepoOrThrow(id);
        repo.setName(request.getName());
        repo.setDescription(request.getDescription());
        repo.setUrl(request.getUrl());
        repo.setLanguage(request.getLanguage());
        repo.setTeam(request.getTeam());
        repoRepository.update(repo);
        return toRepoVO(repo);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public RepoVO toggleRepo(Long id) {
        log.info("toggleRepo id={}", id);
        Repo repo = getRepoOrThrow(id);
        repo.setEnabled(!repo.getEnabled());
        repoRepository.update(repo);
        return toRepoVO(repo);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteRepo(Long id) {
        log.info("deleteRepo id={}", id);
        getRepoOrThrow(id);
        repoSteeringRepository.deleteByRepoId(id);
        repoRepository.deleteById(id);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public BindingResultResponse bindSteering(Long repoId, Long steeringId, RepoSteeringBindRequest request) {
        log.info("bindSteering repoId={} steeringId={}", repoId, steeringId);
        getRepoOrThrow(repoId);

        Steering steering = steeringRepository.getById(steeringId);
        if (steering == null) {
            throw new BusinessException(404, "规范不存在");
        }

        boolean mandatory = request.getMandatory() != null && request.getMandatory();
        repoSteeringRepository.upsertBinding(repoId, steeringId, mandatory);
        RepoSteering binding = repoSteeringRepository.findByPair(repoId, steeringId);

        BindingResultResponse response = new BindingResultResponse();
        response.setBindingId(binding.getId());
        response.setRepoId(repoId);
        response.setSteeringId(steeringId);
        response.setMandatory(mandatory);
        if (!steering.isActive()) {
            response.setWarning("规范当前状态为 " + steering.getStatus().getCode() + "，不参与 MCP 搜索 boost");
        }
        return response;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void unbindSteering(Long repoId, Long steeringId) {
        log.info("unbindSteering repoId={} steeringId={}", repoId, steeringId);
        int deleted = repoSteeringRepository.deleteByPair(repoId, steeringId);
        if (deleted == 0) {
            throw new BusinessException(404, "绑定关系不存在");
        }
    }

    @Override
    @Transactional(readOnly = true)
    public PageResult<RepoSteeringItem> listSteeringsByRepo(Long repoId, int page, int size) {
        // Use repo steering repository to get bindings, then map to VO
        List<RepoSteering> allBindings = repoSteeringRepository.findAllByRepoId(repoId);
        long total = allBindings.size();
        int from = Math.min((page - 1) * size, (int) total);
        int to = Math.min(from + size, (int) total);
        List<RepoSteeringItem> items = allBindings.subList(from, to).stream()
                .map(rs -> {
                    RepoSteeringItem item = new RepoSteeringItem();
                    item.setSteeringId(rs.getSteeringId());
                    item.setMandatory(rs.getMandatory());
                    item.setBindingId(rs.getId());
                    item.setCreatedAt(rs.getCreatedAt());
                    Steering s = steeringRepository.getById(rs.getSteeringId());
                    if (s != null) {
                        item.setSteeringTitle(s.getTitle());
                        item.setSteeringStatus(s.getStatus() != null ? s.getStatus().getCode() : null);
                    }
                    return item;
                })
                .collect(Collectors.toList());
        return PageResult.of(items, total, page, size);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResult<RepoItem> listReposBySteering(Long steeringId, int page, int size) {
        long total = repoSteeringRepository.countBySteeringId(steeringId);
        // Simple approach: get all bindings for this steering, paginate in memory
        // Domain repo doesn't have paged query for this direction
        // For now, return a simplified result
        List<RepoItem> items = List.of();
        return PageResult.of(items, total, page, size);
    }

    // --- private helpers ---

    private Repo getRepoOrThrow(Long id) {
        Repo repo = repoRepository.getById(id);
        if (repo == null) {
            throw new BusinessException(404, "仓库不存在");
        }
        return repo;
    }

    private RepoVO toRepoVO(Repo repo) {
        RepoVO vo = new RepoVO();
        vo.setId(repo.getId());
        vo.setName(repo.getName());
        vo.setFullName(repo.getFullName());
        vo.setDescription(repo.getDescription());
        vo.setUrl(repo.getUrl());
        vo.setLanguage(repo.getLanguage());
        vo.setTeam(repo.getTeam());
        vo.setEnabled(repo.getEnabled());
        vo.setCreatedAt(repo.getCreatedAt());
        vo.setUpdatedAt(repo.getUpdatedAt());
        return vo;
    }
}
