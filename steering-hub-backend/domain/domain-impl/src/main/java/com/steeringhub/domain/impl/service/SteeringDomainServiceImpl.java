package com.steeringhub.domain.impl.service;

import com.steeringhub.common.exception.BusinessException;
import com.steeringhub.common.response.ResultCode;
import com.steeringhub.domain.model.steering.ReviewAction;
import com.steeringhub.domain.model.steering.Steering;
import com.steeringhub.domain.model.steering.SteeringReview;
import com.steeringhub.domain.model.steering.SteeringStatus;
import com.steeringhub.domain.model.steering.SteeringVersion;
import com.steeringhub.domain.model.search.StopWord;
import com.steeringhub.domain.service.SteeringDomainService;
import com.steeringhub.embedding.EmbeddingService;
import com.steeringhub.repository.SteeringRepository;
import com.steeringhub.repository.SteeringReviewRepository;
import com.steeringhub.repository.SteeringVersionRepository;
import com.steeringhub.repository.StopWordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static com.steeringhub.domain.model.steering.SteeringStatus.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class SteeringDomainServiceImpl implements SteeringDomainService {

    private final SteeringRepository steeringRepository;
    private final SteeringVersionRepository steeringVersionRepository;
    private final SteeringReviewRepository steeringReviewRepository;
    private final StopWordRepository stopWordRepository;
    private final EmbeddingService embeddingService;

    @Override
    public void executeReview(Long steeringId, ReviewAction action, String comment, Long reviewerId) {
        Steering steering = steeringRepository.getById(steeringId);
        if (steering == null) {
            throw new BusinessException(ResultCode.STEERING_NOT_FOUND);
        }

        switch (action) {
            case SUBMIT -> handleSubmit(steeringId, steering, comment, reviewerId);
            case APPROVE -> handleApprove(steeringId, steering, comment, reviewerId);
            case REJECT -> handleReject(steeringId, steering, comment, reviewerId);
            case ACTIVATE -> handleActivate(steeringId, steering, comment, reviewerId);
            case DEPRECATE -> handleDeprecate(steeringId, steering, comment, reviewerId);
            case WITHDRAW -> handleWithdraw(steeringId, steering, comment, reviewerId);
            default -> throw new BusinessException(ResultCode.STEERING_STATUS_INVALID.getCode(), "不支持的审核动作: " + action);
        }
    }

    @Override
    public void validateDeletion(Steering steering) {
        if (steering.getStatus() != DRAFT && steering.getStatus() != DEPRECATED) {
            throw new BusinessException(ResultCode.STEERING_STATUS_INVALID.getCode(),
                    "只有草稿（draft）或已废弃（deprecated）的规范可以删除");
        }
    }

    @Override
    public void validateEditable(Steering steering) {
        if (steering.getStatus() == PENDING_REVIEW) {
            throw new BusinessException(ResultCode.STEERING_STATUS_INVALID.getCode(), "审核中的规范不能修改");
        }
        SteeringVersion pendingVersion = steeringVersionRepository.findBySteeringIdAndStatus(steering.getId(), "pending_review");
        if (pendingVersion != null) {
            throw new BusinessException(ResultCode.STEERING_STATUS_INVALID.getCode(), "存在待审核版本，请先撤回后再修改");
        }
    }

    @Override
    public String sanitizeKeywords(String keywords) {
        if (keywords == null || keywords.trim().isEmpty()) {
            return keywords;
        }
        Set<String> stopWords = stopWordRepository.findAllEnabled().stream()
                .map(sw -> sw.getWord().toLowerCase())
                .collect(Collectors.toSet());

        String[] tokens = keywords.split("[,，]+");
        List<String> filtered = new ArrayList<>();
        for (String token : tokens) {
            String t = token.trim();
            if (!t.isEmpty() && !stopWords.contains(t.toLowerCase()) && filtered.size() < 15) {
                filtered.add(t);
            }
        }
        return String.join(",", filtered);
    }

    @Override
    public String stripMarkdown(String content) {
        if (content == null) return "";
        return content
                .replaceAll("```[\\s\\S]*?```", " ")
                .replaceAll("`[^`]*`", " ")
                .replaceAll("#{1,6}\\s+", " ")
                .replaceAll("\\*{1,3}([^*]+)\\*{1,3}", "$1")
                .replaceAll("_{1,3}([^_]+)_{1,3}", "$1")
                .replaceAll("!?\\[[^\\]]*\\]\\([^)]*\\)", " ")
                .replaceAll("[>\\-*+]\\s+", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    // --- private state machine handlers ---

    private void handleSubmit(Long id, Steering steering, String comment, Long reviewerId) {
        if (steering.getStatus() != DRAFT && steering.getStatus() != REJECTED && steering.getStatus() != ACTIVE) {
            throw new BusinessException(ResultCode.STEERING_STATUS_INVALID.getCode(), "当前状态不允许提交审核");
        }
        steeringVersionRepository.updateVersionStatus(id, "draft", "pending_review");
        if (steering.getStatus() != ACTIVE) {
            steering.setStatus(PENDING_REVIEW);
            steeringRepository.update(steering);
        }
        saveReview(id, steering.getCurrentVersion(), ReviewAction.SUBMIT, comment, reviewerId);
    }

    private void handleApprove(Long id, Steering steering, String comment, Long reviewerId) {
        if (steering.getStatus() != PENDING_REVIEW && steering.getStatus() != ACTIVE) {
            throw new BusinessException(ResultCode.STEERING_STATUS_INVALID.getCode(), "当前状态不是待审核");
        }
        steeringVersionRepository.updateVersionStatus(id, "pending_review", "approved");
        if (steering.getStatus() != ACTIVE) {
            steering.setStatus(APPROVED);
            steeringRepository.update(steering);
        }
        saveReview(id, steering.getCurrentVersion(), ReviewAction.APPROVE, comment, reviewerId);
    }

    private void handleReject(Long id, Steering steering, String comment, Long reviewerId) {
        if (steering.getStatus() != PENDING_REVIEW && steering.getStatus() != ACTIVE) {
            throw new BusinessException(ResultCode.STEERING_STATUS_INVALID.getCode(), "当前状态不是待审核");
        }
        steeringVersionRepository.updateVersionStatus(id, "pending_review", "rejected");
        if (steering.getStatus() != ACTIVE) {
            steering.setStatus(REJECTED);
            steeringRepository.update(steering);
        }
        saveReview(id, steering.getCurrentVersion(), ReviewAction.REJECT, comment, reviewerId);
    }

    private void handleActivate(Long id, Steering steering, String comment, Long reviewerId) {
        boolean locked = steeringRepository.compareAndSetStatus(id, steering.getStatus(), ACTIVE);
        if (!locked) {
            throw new BusinessException(ResultCode.STEERING_STATUS_INVALID.getCode(), "并发冲突，请刷新后重试");
        }

        SteeringVersion approvedVersion = steeringVersionRepository.findBySteeringIdAndStatus(id, "approved");
        if (approvedVersion == null) {
            throw new BusinessException(ResultCode.STEERING_STATUS_INVALID.getCode(), "找不到已通过的版本");
        }

        String plainText = stripMarkdown(approvedVersion.getContent());
        float[] embeddingVec = embeddingService.embed(plainText);
        String embeddingStr = toVecStr(embeddingVec);

        steeringVersionRepository.updateVersionStatus(id, "active", "superseded");
        steeringVersionRepository.updateVersionStatus(id, "approved", "active");

        steeringRepository.commitActivate(id, approvedVersion.getTitle(), approvedVersion.getContent(),
                approvedVersion.getTags(), approvedVersion.getKeywords(), approvedVersion.getVersion(), embeddingStr, embeddingStr);

        saveReview(id, approvedVersion.getVersion(), ReviewAction.ACTIVATE, comment, reviewerId);
    }

    private void handleDeprecate(Long id, Steering steering, String comment, Long reviewerId) {
        if (steering.getStatus() != ACTIVE) {
            throw new BusinessException(ResultCode.STEERING_STATUS_INVALID.getCode(), "只有已生效的规范才能废弃");
        }
        steeringVersionRepository.updateVersionStatus(id, "active", "deprecated");
        steering.setStatus(DEPRECATED);
        steeringRepository.update(steering);
        saveReview(id, steering.getCurrentVersion(), ReviewAction.DEPRECATE, comment, reviewerId);
    }

    private void handleWithdraw(Long id, Steering steering, String comment, Long reviewerId) {
        steeringVersionRepository.updateVersionStatus(id, "pending_review", "draft");
        if (steering.getStatus() == PENDING_REVIEW) {
            steering.setStatus(DRAFT);
            steeringRepository.update(steering);
        }
        saveReview(id, steering.getCurrentVersion(), ReviewAction.WITHDRAW, comment, reviewerId);
    }

    private void saveReview(Long steeringId, Integer version, ReviewAction action, String comment, Long reviewerId) {
        SteeringReview review = new SteeringReview();
        review.setSteeringId(steeringId);
        review.setSteeringVersion(version);
        review.setAction(action);
        review.setComment(comment);
        review.setReviewerId(reviewerId);
        steeringReviewRepository.save(review);
    }

    private String toVecStr(float[] vec) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < vec.length; i++) {
            if (i > 0) sb.append(",");
            sb.append(vec[i]);
        }
        sb.append("]");
        return sb.toString();
    }
}
