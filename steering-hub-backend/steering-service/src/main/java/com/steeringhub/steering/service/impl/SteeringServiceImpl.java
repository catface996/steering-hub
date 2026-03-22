package com.steeringhub.steering.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.steeringhub.common.enums.ReviewAction;
import com.steeringhub.common.enums.SteeringStatus;
import com.steeringhub.common.exception.BusinessException;
import com.steeringhub.common.response.ResultCode;
import com.steeringhub.steering.dto.request.CreateSteeringRequest;
import com.steeringhub.steering.dto.request.UpdateSteeringRequest;
import com.steeringhub.steering.dto.response.SteeringDetailResponse;
import com.steeringhub.steering.entity.Steering;
import com.steeringhub.steering.entity.SteeringReview;
import com.steeringhub.steering.entity.SteeringVersion;
import com.steeringhub.steering.entity.SteeringCategory;
import com.steeringhub.steering.entity.StopWord;
import com.steeringhub.steering.mapper.SteeringCategoryMapper;
import com.steeringhub.steering.mapper.SteeringMapper;
import com.steeringhub.steering.mapper.SteeringReviewMapper;
import com.steeringhub.steering.mapper.SteeringVersionMapper;
import com.steeringhub.steering.mapper.StopWordMapper;
import com.steeringhub.steering.service.SteeringService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.services.bedrockruntime.BedrockRuntimeClient;
import software.amazon.awssdk.services.bedrockruntime.model.InvokeModelRequest;
import software.amazon.awssdk.services.bedrockruntime.model.InvokeModelResponse;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SteeringServiceImpl extends ServiceImpl<SteeringMapper, Steering> implements SteeringService {

    private final SteeringVersionMapper steeringVersionMapper;
    private final SteeringReviewMapper steeringReviewMapper;
    private final SteeringCategoryMapper steeringCategoryMapper;
    private final StopWordMapper stopWordMapper;
    private final BedrockRuntimeClient bedrockRuntimeClient;

    private static final String TITAN_EMBEDDING_MODEL_ID = "amazon.titan-embed-text-v2:0";
    private static final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${embedding.dimensions:512}")
    private int dimensions;

    @Override
    @Transactional
    public SteeringDetailResponse createSteering(CreateSteeringRequest request) {
        Steering steering = new Steering();
        steering.setTitle(request.getTitle());
        steering.setContent(request.getContent());
        steering.setCategoryId(request.getCategoryId());
        steering.setStatus(SteeringStatus.DRAFT);
        steering.setCurrentVersion(1);
        steering.setKeywords(sanitizeKeywords(request.getKeywords()));
        steering.setAuthor(request.getAuthor());
        if (request.getTags() != null) {
            steering.setTags(String.join(",", request.getTags()));
        }
        save(steering);

        // Save initial version
        saveVersion(steering, "初始版本");

        return toDetailResponse(steering);
    }

    @Override
    @Transactional
    public SteeringDetailResponse updateSteering(Long id, UpdateSteeringRequest request) {
        Steering steering = getById(id);
        if (steering == null) {
            throw new BusinessException(ResultCode.STEERING_NOT_FOUND);
        }
        if (steering.getStatus() == SteeringStatus.PENDING_REVIEW) {
            throw new BusinessException(ResultCode.STEERING_STATUS_INVALID.getCode(), "审核中的规范不能修改");
        }

        steering.setTitle(request.getTitle());
        steering.setContent(request.getContent());
        if (request.getCategoryId() != null) {
            steering.setCategoryId(request.getCategoryId());
        }
        steering.setKeywords(sanitizeKeywords(request.getKeywords()));
        if (request.getTags() != null) {
            steering.setTags(String.join(",", request.getTags()));
        }
        steering.setAgentQueries(request.getAgentQueries());
        steering.setCurrentVersion(steering.getCurrentVersion() + 1);
        // Reset to DRAFT after edit if it was ACTIVE/REJECTED
        if (steering.getStatus() == SteeringStatus.REJECTED || steering.getStatus() == SteeringStatus.DEPRECATED) {
            steering.setStatus(SteeringStatus.DRAFT);
        }
        updateById(steering);

        saveVersion(steering, request.getChangeLog());

        return toDetailResponse(steering);
    }

    @Override
    public SteeringDetailResponse getSteeringDetail(Long id) {
        Steering steering = getById(id);
        if (steering == null) {
            throw new BusinessException(ResultCode.STEERING_NOT_FOUND);
        }
        return toDetailResponse(steering);
    }

    @Override
    public IPage<SteeringDetailResponse> pageSteerings(Page<Steering> page, Long categoryId, String status, String keyword) {
        LambdaQueryWrapper<Steering> wrapper = new LambdaQueryWrapper<Steering>()
                .eq(categoryId != null, Steering::getCategoryId, categoryId)
                .eq(StringUtils.hasText(status), Steering::getStatus, status)
                .and(StringUtils.hasText(keyword), w ->
                        w.like(Steering::getTitle, keyword).or().like(Steering::getKeywords, keyword))
                .orderByDesc(Steering::getUpdatedAt);

        IPage<Steering> steeringPage = page(page, wrapper);
        return steeringPage.convert(this::toDetailResponse);
    }

    @Override
    @Transactional
    public void reviewSteering(Long id, ReviewAction action, String comment, Long reviewerId, String reviewerName) {
        Steering steering = getById(id);
        if (steering == null) {
            throw new BusinessException(ResultCode.STEERING_NOT_FOUND);
        }

        SteeringStatus newStatus = switch (action) {
            case SUBMIT -> {
                if (steering.getStatus() != SteeringStatus.DRAFT && steering.getStatus() != SteeringStatus.REJECTED) {
                    throw new BusinessException(ResultCode.STEERING_STATUS_INVALID.getCode(), "当前状态不允许提交审核");
                }
                yield SteeringStatus.PENDING_REVIEW;
            }
            case APPROVE -> {
                if (steering.getStatus() != SteeringStatus.PENDING_REVIEW) {
                    throw new BusinessException(ResultCode.STEERING_STATUS_INVALID.getCode(), "当前状态不是待审核");
                }
                yield SteeringStatus.APPROVED;
            }
            case REJECT -> {
                if (steering.getStatus() != SteeringStatus.PENDING_REVIEW) {
                    throw new BusinessException(ResultCode.STEERING_STATUS_INVALID.getCode(), "当前状态不是待审核");
                }
                yield SteeringStatus.REJECTED;
            }
            case ACTIVATE -> {
                if (steering.getStatus() != SteeringStatus.APPROVED) {
                    throw new BusinessException(ResultCode.STEERING_STATUS_INVALID.getCode(), "只有审核通过的规范才能生效");
                }
                yield SteeringStatus.ACTIVE;
            }
            case DEPRECATE -> {
                if (steering.getStatus() != SteeringStatus.ACTIVE) {
                    throw new BusinessException(ResultCode.STEERING_STATUS_INVALID.getCode(), "只有已生效的规范才能废弃");
                }
                yield SteeringStatus.DEPRECATED;
            }
            default -> throw new BusinessException(ResultCode.STEERING_STATUS_INVALID.getCode(), "不支持的审核动作: " + action);
        };

        steering.setStatus(newStatus);
        updateById(steering);

        // Record review history
        SteeringReview review = new SteeringReview();
        review.setSteeringId(id);
        review.setSteeringVersion(steering.getCurrentVersion());
        review.setAction(action);
        review.setComment(comment);
        review.setReviewerId(reviewerId);
        review.setReviewerName(reviewerName);
        steeringReviewMapper.insert(review);
    }

    @Override
    @Transactional
    public SteeringDetailResponse rollbackSteering(Long id, int version) {
        Steering steering = getById(id);
        if (steering == null) {
            throw new BusinessException(ResultCode.STEERING_NOT_FOUND);
        }
        SteeringVersion targetVersion = steeringVersionMapper.selectBySteeringIdAndVersion(id, version);
        if (targetVersion == null) {
            throw new BusinessException(ResultCode.STEERING_NOT_FOUND.getCode(), "目标版本不存在: " + version);
        }

        steering.setTitle(targetVersion.getTitle());
        steering.setContent(targetVersion.getContent());
        steering.setTags(targetVersion.getTags());
        steering.setKeywords(sanitizeKeywords(targetVersion.getKeywords()));
        steering.setCurrentVersion(steering.getCurrentVersion() + 1);
        steering.setStatus(SteeringStatus.DRAFT);
        updateById(steering);

        saveVersion(steering, "回滚至版本 " + version);

        return toDetailResponse(steering);
    }

    @Override
    @Transactional
    public void deleteSteering(Long id) {
        Steering steering = getById(id);
        if (steering == null) {
            throw new BusinessException(ResultCode.STEERING_NOT_FOUND);
        }
        if (steering.getStatus() == SteeringStatus.ACTIVE) {
            throw new BusinessException(ResultCode.STEERING_STATUS_INVALID.getCode(), "已生效的规范不能直接删除，请先废弃");
        }
        removeById(id);
    }

    @Override
    public void updateEmbedding(Long steeringId, float[] embedding) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < embedding.length; i++) {
            if (i > 0) sb.append(",");
            sb.append(embedding[i]);
        }
        sb.append("]");
        baseMapper.updateEmbedding(steeringId, sb.toString());
    }

    @Override
    public void generateContentEmbedding(Long id) {
        Steering steering = getById(id);
        if (steering == null) {
            throw new BusinessException(ResultCode.STEERING_NOT_FOUND);
        }
        String plainText = stripMarkdown(steering.getContent());
        float[] vec = embedText(plainText);
        String vecStr = toVecStr(vec);
        baseMapper.updateContentEmbedding(id, vecStr);
    }

    private String stripMarkdown(String content) {
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

    private float[] embedText(String text) {
        try {
            Map<String, Object> body = new HashMap<>();
            body.put("inputText", text);
            body.put("dimensions", dimensions);
            body.put("normalize", true);
            String requestBody = objectMapper.writeValueAsString(body);
            InvokeModelRequest request = InvokeModelRequest.builder()
                    .modelId(TITAN_EMBEDDING_MODEL_ID)
                    .contentType("application/json")
                    .accept("application/json")
                    .body(SdkBytes.fromUtf8String(requestBody))
                    .build();
            InvokeModelResponse response = bedrockRuntimeClient.invokeModel(request);
            JsonNode root = objectMapper.readTree(response.body().asUtf8String());
            JsonNode embeddingNode = root.get("embedding");
            float[] embedding = new float[embeddingNode.size()];
            for (int i = 0; i < embeddingNode.size(); i++) {
                embedding[i] = (float) embeddingNode.get(i).asDouble();
            }
            return embedding;
        } catch (Exception e) {
            log.error("Failed to generate content embedding for spec", e);
            throw new BusinessException(ResultCode.EMBEDDING_FAILED);
        }
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

    /**
     * 过滤关键词：移除停用词并限制最多15个关键词
     */
    private String sanitizeKeywords(String keywords) {
        if (keywords == null || keywords.trim().isEmpty()) {
            return keywords;
        }

        // 加载启用的停用词
        Set<String> stopWords = stopWordMapper.selectList(
            new LambdaQueryWrapper<StopWord>().eq(StopWord::getEnabled, true)
        ).stream().map(sw -> sw.getWord().toLowerCase()).collect(Collectors.toSet());

        // 分词并过滤
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

    private void saveVersion(Steering steering, String changeLog) {
        SteeringVersion version = new SteeringVersion();
        version.setSteeringId(steering.getId());
        version.setVersion(steering.getCurrentVersion());
        version.setTitle(steering.getTitle());
        version.setContent(steering.getContent());
        version.setTags(steering.getTags());
        version.setKeywords(steering.getKeywords());
        version.setChangeLog(changeLog);
        version.setCreatedBy(steering.getCreatedBy());
        steeringVersionMapper.insert(version);
    }

    private SteeringDetailResponse toDetailResponse(Steering steering) {
        SteeringDetailResponse response = new SteeringDetailResponse();
        BeanUtils.copyProperties(steering, response);
        if (StringUtils.hasText(steering.getTags())) {
            response.setTags(Arrays.asList(steering.getTags().split(",")));
        }
        if (steering.getCategoryId() != null) {
            SteeringCategory category = steeringCategoryMapper.selectById(steering.getCategoryId());
            if (category != null) {
                response.setCategoryName(category.getName());
            }
        }
        return response;
    }
}
