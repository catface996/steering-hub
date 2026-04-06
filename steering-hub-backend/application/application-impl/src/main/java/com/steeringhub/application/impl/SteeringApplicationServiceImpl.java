package com.steeringhub.application.impl;

import com.steeringhub.application.api.dto.request.CreateSteeringRequest;
import com.steeringhub.application.api.dto.request.ReviewSteeringRequest;
import com.steeringhub.application.api.dto.request.UpdateSteeringRequest;
import com.steeringhub.application.api.dto.response.CompareVO;
import com.steeringhub.application.api.dto.response.DiffVO;
import com.steeringhub.application.api.dto.response.ReviewQueueItemVO;
import com.steeringhub.application.api.dto.response.SpecDetailVO;
import com.steeringhub.application.api.dto.response.SteeringDetailResponse;
import com.steeringhub.application.api.dto.response.SteeringVersionDetailVO;
import com.steeringhub.application.api.dto.response.SteeringVersionVO;
import com.steeringhub.application.api.service.SteeringApplicationService;
import com.steeringhub.common.exception.BusinessException;
import com.steeringhub.common.response.PageResult;
import com.steeringhub.common.response.ResultCode;
import com.steeringhub.domain.model.steering.Steering;
import com.steeringhub.domain.model.steering.SteeringStatus;
import com.steeringhub.domain.model.steering.SteeringVersion;
import com.steeringhub.domain.service.SteeringDomainService;
import com.steeringhub.embedding.EmbeddingService;
import com.steeringhub.repository.CategoryRepository;
import com.steeringhub.repository.SteeringRepository;
import com.steeringhub.repository.SteeringReviewRepository;
import com.steeringhub.repository.SteeringUsageRepository;
import com.steeringhub.repository.SteeringVersionRepository;
import com.steeringhub.repository.query.SteeringQuery;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SteeringApplicationServiceImpl implements SteeringApplicationService {

    private final SteeringDomainService steeringDomainService;
    private final SteeringRepository steeringRepository;
    private final SteeringVersionRepository steeringVersionRepository;
    private final SteeringReviewRepository steeringReviewRepository;
    private final SteeringUsageRepository steeringUsageRepository;
    private final EmbeddingService embeddingService;
    private final CategoryRepository categoryRepository;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public SteeringDetailResponse createSteering(CreateSteeringRequest request) {
        log.info("createSteering start title={}", request.getTitle());

        Steering steering = new Steering();
        steering.setTitle(request.getTitle());
        steering.setContent(request.getContent());
        steering.setCategoryId(request.getCategoryId());
        steering.setStatus(SteeringStatus.DRAFT);
        steering.setCurrentVersion(1);
        steering.setKeywords(steeringDomainService.sanitizeKeywords(request.getKeywords()));
        steering.setAuthor(request.getAuthor());
        if (request.getTags() != null) {
            steering.setTags(String.join(",", request.getTags()));
        }
        steeringRepository.save(steering);

        // Save initial version
        saveVersion(steering, "初始版本");

        log.info("createSteering success id={}", steering.getId());
        return toDetailResponse(steering);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public SteeringDetailResponse updateSteering(Long id, UpdateSteeringRequest request) {
        log.info("updateSteering start id={}", id);

        Steering steering = getSteeringOrThrow(id);
        steeringDomainService.validateEditable(steering);

        if (steering.getStatus() == SteeringStatus.ACTIVE) {
            handleActiveUpdate(id, steering, request);
            return toDetailResponse(steering);
        }

        // DRAFT / REJECTED / DEPRECATED: update main table
        steering.setTitle(request.getTitle());
        steering.setContent(request.getContent());
        if (request.getCategoryId() != null) {
            steering.setCategoryId(request.getCategoryId());
        }
        steering.setKeywords(steeringDomainService.sanitizeKeywords(request.getKeywords()));
        if (request.getTags() != null) {
            steering.setTags(String.join(",", request.getTags()));
        }
        steering.setAgentQueries(request.getAgentQueries());
        steering.setCurrentVersion(steering.getCurrentVersion() + 1);
        if (steering.getStatus() == SteeringStatus.REJECTED || steering.getStatus() == SteeringStatus.DEPRECATED) {
            steering.setStatus(SteeringStatus.DRAFT);
        }
        steeringRepository.update(steering);
        saveVersion(steering, request.getChangeLog());

        log.info("updateSteering success id={}", id);
        return toDetailResponse(steering);
    }

    @Override
    @Transactional(readOnly = true)
    public SteeringDetailResponse getSteeringDetail(Long id) {
        return toDetailResponse(getSteeringOrThrow(id));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResult<SteeringDetailResponse> pageSteerings(int page, int size, Long categoryId, String status, String keyword) {
        SteeringQuery query = new SteeringQuery();
        query.setCategoryId(categoryId);
        if (status != null && !status.isBlank()) {
            query.setStatus(SteeringStatus.fromCode(status));
        }
        query.setKeyword(keyword);

        PageResult<Steering> result = steeringRepository.page(query, page, size);
        List<SteeringDetailResponse> voList = result.getRecords().stream()
                .map(this::toDetailResponse)
                .collect(Collectors.toList());
        return PageResult.of(voList, result.getTotal(), page, size);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void reviewSteering(Long id, ReviewSteeringRequest request, Long reviewerId, String reviewerName) {
        log.info("reviewSteering id={} action={} reviewerId={}", id, request.getAction(), reviewerId);
        steeringDomainService.executeReview(id, request.getAction(), request.getComment(), reviewerId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public SteeringDetailResponse rollbackSteering(Long id, int version) {
        log.info("rollbackSteering id={} targetVersion={}", id, version);

        Steering steering = getSteeringOrThrow(id);
        SteeringVersion targetVersion = steeringVersionRepository.findBySteeringIdAndVersion(id, version);
        if (targetVersion == null) {
            throw new BusinessException(ResultCode.STEERING_NOT_FOUND.getCode(), "目标版本不存在: " + version);
        }

        steering.setTitle(targetVersion.getTitle());
        steering.setContent(targetVersion.getContent());
        steering.setTags(targetVersion.getTags());
        steering.setKeywords(steeringDomainService.sanitizeKeywords(targetVersion.getKeywords()));
        steering.setCurrentVersion(steering.getCurrentVersion() + 1);
        steering.setStatus(SteeringStatus.DRAFT);
        steeringRepository.update(steering);
        saveVersion(steering, "回滚至版本 " + version);

        return toDetailResponse(steering);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteSteering(Long id) {
        log.info("deleteSteering id={}", id);
        Steering steering = getSteeringOrThrow(id);
        steeringDomainService.validateDeletion(steering);
        steeringRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResult<SteeringVersionVO> listVersions(Long id, int page, int size) {
        getSteeringOrThrow(id);
        PageResult<SteeringVersion> result = steeringVersionRepository.page(id, page, size);
        List<SteeringVersionVO> voList = result.getRecords().stream()
                .map(this::toVersionVO)
                .collect(Collectors.toList());
        return PageResult.of(voList, result.getTotal(), page, size);
    }

    @Override
    @Transactional(readOnly = true)
    public SteeringVersionDetailVO getVersionDetail(Long id, int versionNumber) {
        getSteeringOrThrow(id);
        SteeringVersion v = steeringVersionRepository.findBySteeringIdAndVersion(id, versionNumber);
        if (v == null) {
            throw new BusinessException(ResultCode.STEERING_NOT_FOUND.getCode(), "版本不存在: " + versionNumber);
        }
        return toVersionDetailVO(v);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteDraftVersion(Long steeringId, int versionNumber) {
        log.info("deleteDraftVersion steeringId={} version={}", steeringId, versionNumber);
        SteeringVersion version = steeringVersionRepository.findBySteeringIdAndVersion(steeringId, versionNumber);
        if (version == null) {
            throw new BusinessException(ResultCode.STEERING_NOT_FOUND.getCode(), "版本不存在");
        }
        if (!"draft".equals(version.getStatus())) {
            throw new BusinessException(ResultCode.STEERING_STATUS_INVALID.getCode(), "只能删除草稿版本");
        }
        // Use precise version-based status update (not by status which affects all drafts)
        steeringVersionRepository.updateStatusByVersion(steeringId, versionNumber, "deleted");
    }

    @Override
    @Transactional(readOnly = true)
    public PageResult<ReviewQueueItemVO> listReviewQueue(int page, int size) {
        // Step 1: paginated query for steerings
        SteeringQuery query = new SteeringQuery();
        PageResult<Steering> steeringPage = steeringRepository.page(query, page, size);
        List<Steering> steerings = steeringPage.getRecords();
        if (steerings.isEmpty()) {
            return PageResult.of(List.of(), 0, page, size);
        }

        // Step 2: batch load all versions for this page's steeringIds (avoid N+1)
        List<Long> steeringIds = steerings.stream().map(Steering::getId).collect(Collectors.toList());
        List<SteeringVersion> allVersions = steeringVersionRepository.findBySteeringIdIn(steeringIds);
        Map<Long, List<SteeringVersion>> versionsBySteeringId = allVersions.stream()
                .collect(Collectors.groupingBy(SteeringVersion::getSteeringId));

        // Step 3: batch load categories
        Set<Long> categoryIds = steerings.stream()
                .map(Steering::getCategoryId).filter(Objects::nonNull).collect(Collectors.toSet());
        Map<Long, String> categoryNameMap = categoryIds.isEmpty()
                ? Map.of()
                : categoryIds.stream()
                    .map(categoryRepository::getById)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toMap(c -> c.getId(), c -> c.getName(), (a, b) -> a));

        // Step 4: assemble in memory
        List<ReviewQueueItemVO> items = steerings.stream()
                .map(s -> {
                    List<SteeringVersion> versions = versionsBySteeringId.getOrDefault(s.getId(), List.of());
                    SteeringVersion pending = versions.stream()
                            .filter(v -> "pending_review".equals(v.getStatus())).findFirst().orElse(null);
                    if (pending == null) return null;

                    SteeringVersion active = versions.stream()
                            .filter(v -> "active".equals(v.getStatus())).findFirst().orElse(null);

                    ReviewQueueItemVO vo = new ReviewQueueItemVO();
                    vo.setSteeringId(s.getId());
                    vo.setSteeringTitle(s.getTitle());
                    vo.setSteeringStatus(s.getStatus() != null ? s.getStatus().getCode() : null);
                    vo.setCategoryName(categoryNameMap.get(s.getCategoryId()));
                    vo.setCurrentActiveVersion(active != null ? active.getVersion() : null);
                    vo.setVersionId(pending.getId());
                    vo.setPendingVersion(pending.getVersion());
                    vo.setPendingTitle(pending.getTitle());
                    vo.setChangeLog(pending.getChangeLog());
                    vo.setVersionStatus(pending.getStatus());
                    vo.setSubmittedAt(pending.getUpdatedAt());
                    vo.setIsRevision(active != null);
                    return vo;
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        return PageResult.of(items, steeringPage.getTotal(), page, size);
    }

    @Override
    @Transactional(readOnly = true)
    public DiffVO getVersionDiff(Long steeringId) {
        Steering steering = getSteeringOrThrow(steeringId);

        DiffVO diff = new DiffVO();
        diff.setSteeringId(steeringId);
        diff.setSteeringStatus(steering.getStatus() != null ? steering.getStatus().getCode() : null);

        SteeringVersion activeVersion = steeringVersionRepository.findBySteeringIdAndStatus(steeringId, "active");
        if (activeVersion != null) {
            diff.setActiveVersion(toSnapshot(activeVersion));
        } else {
            DiffVO.VersionSnapshot baseline = new DiffVO.VersionSnapshot();
            baseline.setVersionNumber(steering.getCurrentVersion());
            baseline.setTitle(steering.getTitle());
            baseline.setContent(steering.getContent());
            baseline.setTags(steering.getTags());
            baseline.setKeywords(steering.getKeywords());
            baseline.setStatus(steering.getStatus() != null ? steering.getStatus().getCode() : null);
            baseline.setCreatedAt(steering.getCreatedAt());
            diff.setActiveVersion(baseline);
        }

        SteeringVersion pendingVersion = steeringVersionRepository.findBySteeringIdAndStatus(steeringId, "pending_review");
        if (pendingVersion == null) {
            throw new BusinessException(ResultCode.STEERING_STATUS_INVALID.getCode(), "该规范没有待审核版本");
        }
        diff.setPendingVersion(toSnapshot(pendingVersion));

        return diff;
    }

    @Override
    @Transactional(readOnly = true)
    public CompareVO compare(Long idA, Long idB) {
        Steering specA = steeringRepository.getById(idA);
        Steering specB = steeringRepository.getById(idB);
        CompareVO vo = new CompareVO();
        vo.setSpecA(specA != null ? toSpecDetailVO(specA) : null);
        vo.setSpecB(specB != null ? toSpecDetailVO(specB) : null);
        return vo;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void generateContentEmbedding(Long steeringId) {
        log.info("generateContentEmbedding steeringId={}", steeringId);
        Steering steering = getSteeringOrThrow(steeringId);
        float[] embedding = embeddingService.embedSteering(steering.getTitle(), steering.getKeywords(), steering.getTags());
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < embedding.length; i++) {
            if (i > 0) sb.append(",");
            sb.append(embedding[i]);
        }
        sb.append("]");
        steeringRepository.updateContentEmbedding(steeringId, sb.toString());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> mcpCreateSteering(String title, String content, String categoryCode, List<String> tags) {
        log.info("mcpCreateSteering title={} categoryCode={}", title, categoryCode);

        com.steeringhub.domain.model.category.SteeringCategory category = categoryRepository.findByCode(categoryCode);
        if (category == null || !category.getEnabled()) {
            throw new BusinessException(ResultCode.CATEGORY_NOT_FOUND);
        }

        CreateSteeringRequest createReq = new CreateSteeringRequest();
        createReq.setTitle(title);
        createReq.setContent(content);
        createReq.setCategoryId(category.getId());
        createReq.setTags(tags);

        SteeringDetailResponse detail = createSteering(createReq);
        return Map.of("id", detail.getId(), "title", detail.getTitle(), "status", detail.getStatus().getCode());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> mcpReviseSteering(Long id, String content, String changeLog, List<String> tags) {
        log.info("mcpReviseSteering id={}", id);

        Steering steering = getSteeringOrThrow(id);

        UpdateSteeringRequest updateReq = new UpdateSteeringRequest();
        updateReq.setTitle(steering.getTitle());
        updateReq.setContent(content);
        updateReq.setTags(tags);
        updateReq.setChangeLog(changeLog);

        updateSteering(id, updateReq);

        // Auto-submit for review
        ReviewSteeringRequest reviewReq = new ReviewSteeringRequest();
        reviewReq.setAction(com.steeringhub.domain.model.steering.ReviewAction.SUBMIT);
        reviewReq.setComment("MCP agent 提交修订: " + changeLog);
        reviewSteering(id, reviewReq, null, "mcp-agent");

        return Map.of("id", id, "title", steering.getTitle(), "status", "pending_review", "message", "修订已提交，等待审批");
    }

    // --- private helpers ---

    private Steering getSteeringOrThrow(Long id) {
        Steering steering = steeringRepository.getById(id);
        if (steering == null) {
            throw new BusinessException(ResultCode.STEERING_NOT_FOUND);
        }
        return steering;
    }

    private void handleActiveUpdate(Long id, Steering steering, UpdateSteeringRequest request) {
        SteeringVersion existingDraft = steeringVersionRepository.findBySteeringIdAndStatus(id, "draft");
        if (existingDraft != null) {
            existingDraft.setTitle(request.getTitle());
            existingDraft.setContent(request.getContent());
            if (request.getTags() != null) {
                existingDraft.setTags(String.join(",", request.getTags()));
            }
            existingDraft.setKeywords(steeringDomainService.sanitizeKeywords(request.getKeywords()));
            existingDraft.setChangeLog(request.getChangeLog());
            steeringVersionRepository.update(existingDraft);
        } else {
            Integer maxVersion = steeringVersionRepository.findMaxVersionBySteeringId(id);
            int newVersionNumber = (maxVersion == null ? 0 : maxVersion) + 1;

            SteeringVersion newDraft = new SteeringVersion();
            newDraft.setSteeringId(id);
            newDraft.setVersion(newVersionNumber);
            newDraft.setTitle(request.getTitle());
            newDraft.setContent(request.getContent());
            if (request.getTags() != null) {
                newDraft.setTags(String.join(",", request.getTags()));
            }
            newDraft.setKeywords(steeringDomainService.sanitizeKeywords(request.getKeywords()));
            newDraft.setChangeLog(request.getChangeLog());
            newDraft.setStatus("draft");
            newDraft.setCreatedBy(steering.getCreatedBy());
            steeringVersionRepository.save(newDraft);
        }
    }

    private void saveVersion(Steering steering, String changeLog) {
        SteeringVersion version = new SteeringVersion();
        version.setSteeringId(steering.getId());
        version.setVersion(steering.getCurrentVersion());
        version.setTitle(steering.getTitle());
        version.setContent(steering.getContent());
        version.setTags(steering.getTags());
        version.setKeywords(steering.getKeywords());
        version.setChangeLog(changeLog);
        version.setStatus("draft");
        version.setCreatedBy(steering.getCreatedBy());
        steeringVersionRepository.save(version);
    }

    private SteeringDetailResponse toDetailResponse(Steering steering) {
        SteeringDetailResponse response = new SteeringDetailResponse();
        response.setId(steering.getId());
        response.setTitle(steering.getTitle());
        response.setContent(steering.getContent());
        response.setCategoryId(steering.getCategoryId());
        response.setStatus(steering.getStatus());
        response.setCurrentVersion(steering.getCurrentVersion());
        response.setKeywords(steering.getKeywords());
        response.setAgentQueries(steering.getAgentQueries());
        response.setAuthor(steering.getAuthor());
        response.setCreatedAt(steering.getCreatedAt());
        response.setUpdatedAt(steering.getUpdatedAt());
        if (steering.getTags() != null && !steering.getTags().isBlank()) {
            response.setTags(Arrays.asList(steering.getTags().split(",")));
        }
        if (steering.getCategoryId() != null) {
            var category = categoryRepository.getById(steering.getCategoryId());
            if (category != null) {
                response.setCategoryName(category.getName());
            }
        }
        return response;
    }

    private SteeringVersionVO toVersionVO(SteeringVersion v) {
        SteeringVersionVO vo = new SteeringVersionVO();
        vo.setId(v.getId());
        vo.setVersionNumber(v.getVersion());
        vo.setStatus(v.getStatus());
        vo.setChangeSummary(v.getChangeLog());
        vo.setCreatedAt(v.getCreatedAt());
        vo.setUpdatedAt(v.getUpdatedAt());
        return vo;
    }

    private SteeringVersionDetailVO toVersionDetailVO(SteeringVersion v) {
        SteeringVersionDetailVO vo = new SteeringVersionDetailVO();
        vo.setId(v.getId());
        vo.setSteeringId(v.getSteeringId());
        vo.setVersionNumber(v.getVersion());
        vo.setTitle(v.getTitle());
        vo.setContent(v.getContent());
        vo.setTags(v.getTags());
        vo.setKeywords(v.getKeywords());
        vo.setStatus(v.getStatus());
        vo.setChangeSummary(v.getChangeLog());
        vo.setCreatedAt(v.getCreatedAt());
        vo.setUpdatedAt(v.getUpdatedAt());
        return vo;
    }

    private SpecDetailVO toSpecDetailVO(Steering s) {
        SpecDetailVO vo = new SpecDetailVO();
        vo.setId(s.getId());
        vo.setTitle(s.getTitle());
        vo.setTags(s.getTags());
        vo.setKeywords(s.getKeywords());
        vo.setContent(s.getContent());
        vo.setStatus(s.getStatus() != null ? s.getStatus().getCode() : null);
        vo.setUpdatedAt(s.getUpdatedAt());
        return vo;
    }

    private DiffVO.VersionSnapshot toSnapshot(SteeringVersion v) {
        DiffVO.VersionSnapshot snapshot = new DiffVO.VersionSnapshot();
        snapshot.setVersionNumber(v.getVersion());
        snapshot.setTitle(v.getTitle());
        snapshot.setContent(v.getContent());
        snapshot.setTags(v.getTags());
        snapshot.setKeywords(v.getKeywords());
        snapshot.setStatus(v.getStatus());
        snapshot.setChangeLog(v.getChangeLog());
        snapshot.setCreatedAt(v.getCreatedAt());
        return snapshot;
    }
}
