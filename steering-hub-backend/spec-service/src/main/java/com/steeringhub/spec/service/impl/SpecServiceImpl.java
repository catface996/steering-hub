package com.steeringhub.spec.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.steeringhub.common.enums.ReviewAction;
import com.steeringhub.common.enums.SpecStatus;
import com.steeringhub.common.exception.BusinessException;
import com.steeringhub.common.response.ResultCode;
import com.steeringhub.spec.dto.request.CreateSpecRequest;
import com.steeringhub.spec.dto.request.UpdateSpecRequest;
import com.steeringhub.spec.dto.response.SpecDetailResponse;
import com.steeringhub.spec.entity.Spec;
import com.steeringhub.spec.entity.SpecReview;
import com.steeringhub.spec.entity.SpecVersion;
import com.steeringhub.spec.entity.SpecCategory;
import com.steeringhub.spec.mapper.SpecCategoryMapper;
import com.steeringhub.spec.mapper.SpecMapper;
import com.steeringhub.spec.mapper.SpecReviewMapper;
import com.steeringhub.spec.mapper.SpecVersionMapper;
import com.steeringhub.spec.service.SpecService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SpecServiceImpl extends ServiceImpl<SpecMapper, Spec> implements SpecService {

    private final SpecVersionMapper specVersionMapper;
    private final SpecReviewMapper specReviewMapper;
    private final SpecCategoryMapper specCategoryMapper;

    @Override
    @Transactional
    public SpecDetailResponse createSpec(CreateSpecRequest request) {
        Spec spec = new Spec();
        spec.setTitle(request.getTitle());
        spec.setContent(request.getContent());
        spec.setCategoryId(request.getCategoryId());
        spec.setStatus(SpecStatus.DRAFT);
        spec.setCurrentVersion(1);
        spec.setKeywords(request.getKeywords());
        spec.setAuthor(request.getAuthor());
        if (request.getTags() != null) {
            spec.setTags(String.join(",", request.getTags()));
        }
        save(spec);

        // Save initial version
        saveVersion(spec, "初始版本");

        return toDetailResponse(spec);
    }

    @Override
    @Transactional
    public SpecDetailResponse updateSpec(Long id, UpdateSpecRequest request) {
        Spec spec = getById(id);
        if (spec == null) {
            throw new BusinessException(ResultCode.SPEC_NOT_FOUND);
        }
        if (spec.getStatus() == SpecStatus.PENDING_REVIEW) {
            throw new BusinessException(ResultCode.SPEC_STATUS_INVALID.getCode(), "审核中的规范不能修改");
        }

        spec.setTitle(request.getTitle());
        spec.setContent(request.getContent());
        if (request.getCategoryId() != null) {
            spec.setCategoryId(request.getCategoryId());
        }
        spec.setKeywords(request.getKeywords());
        if (request.getTags() != null) {
            spec.setTags(String.join(",", request.getTags()));
        }
        spec.setCurrentVersion(spec.getCurrentVersion() + 1);
        // Reset to DRAFT after edit if it was ACTIVE/REJECTED
        if (spec.getStatus() == SpecStatus.REJECTED || spec.getStatus() == SpecStatus.DEPRECATED) {
            spec.setStatus(SpecStatus.DRAFT);
        }
        updateById(spec);

        saveVersion(spec, request.getChangeLog());

        return toDetailResponse(spec);
    }

    @Override
    public SpecDetailResponse getSpecDetail(Long id) {
        Spec spec = getById(id);
        if (spec == null) {
            throw new BusinessException(ResultCode.SPEC_NOT_FOUND);
        }
        return toDetailResponse(spec);
    }

    @Override
    public IPage<SpecDetailResponse> pageSpecs(Page<Spec> page, Long categoryId, String status, String keyword) {
        LambdaQueryWrapper<Spec> wrapper = new LambdaQueryWrapper<Spec>()
                .eq(categoryId != null, Spec::getCategoryId, categoryId)
                .eq(StringUtils.hasText(status), Spec::getStatus, status)
                .and(StringUtils.hasText(keyword), w ->
                        w.like(Spec::getTitle, keyword).or().like(Spec::getKeywords, keyword))
                .orderByDesc(Spec::getUpdatedAt);

        IPage<Spec> specPage = page(page, wrapper);
        return specPage.convert(this::toDetailResponse);
    }

    @Override
    @Transactional
    public void reviewSpec(Long id, ReviewAction action, String comment, Long reviewerId, String reviewerName) {
        Spec spec = getById(id);
        if (spec == null) {
            throw new BusinessException(ResultCode.SPEC_NOT_FOUND);
        }

        SpecStatus newStatus = switch (action) {
            case SUBMIT -> {
                if (spec.getStatus() != SpecStatus.DRAFT && spec.getStatus() != SpecStatus.REJECTED) {
                    throw new BusinessException(ResultCode.SPEC_STATUS_INVALID.getCode(), "当前状态不允许提交审核");
                }
                yield SpecStatus.PENDING_REVIEW;
            }
            case APPROVE -> {
                if (spec.getStatus() != SpecStatus.PENDING_REVIEW) {
                    throw new BusinessException(ResultCode.SPEC_STATUS_INVALID.getCode(), "当前状态不是待审核");
                }
                yield SpecStatus.APPROVED;
            }
            case REJECT -> {
                if (spec.getStatus() != SpecStatus.PENDING_REVIEW) {
                    throw new BusinessException(ResultCode.SPEC_STATUS_INVALID.getCode(), "当前状态不是待审核");
                }
                yield SpecStatus.REJECTED;
            }
            case ACTIVATE -> {
                if (spec.getStatus() != SpecStatus.APPROVED) {
                    throw new BusinessException(ResultCode.SPEC_STATUS_INVALID.getCode(), "只有审核通过的规范才能生效");
                }
                yield SpecStatus.ACTIVE;
            }
            case DEPRECATE -> {
                if (spec.getStatus() != SpecStatus.ACTIVE) {
                    throw new BusinessException(ResultCode.SPEC_STATUS_INVALID.getCode(), "只有已生效的规范才能废弃");
                }
                yield SpecStatus.DEPRECATED;
            }
            default -> throw new BusinessException(ResultCode.SPEC_STATUS_INVALID.getCode(), "不支持的审核动作: " + action);
        };

        spec.setStatus(newStatus);
        updateById(spec);

        // Record review history
        SpecReview review = new SpecReview();
        review.setSpecId(id);
        review.setSpecVersion(spec.getCurrentVersion());
        review.setAction(action);
        review.setComment(comment);
        review.setReviewerId(reviewerId);
        review.setReviewerName(reviewerName);
        specReviewMapper.insert(review);
    }

    @Override
    @Transactional
    public SpecDetailResponse rollbackSpec(Long id, int version) {
        Spec spec = getById(id);
        if (spec == null) {
            throw new BusinessException(ResultCode.SPEC_NOT_FOUND);
        }
        SpecVersion targetVersion = specVersionMapper.selectBySpecIdAndVersion(id, version);
        if (targetVersion == null) {
            throw new BusinessException(ResultCode.SPEC_NOT_FOUND.getCode(), "目标版本不存在: " + version);
        }

        spec.setTitle(targetVersion.getTitle());
        spec.setContent(targetVersion.getContent());
        spec.setTags(targetVersion.getTags());
        spec.setKeywords(targetVersion.getKeywords());
        spec.setCurrentVersion(spec.getCurrentVersion() + 1);
        spec.setStatus(SpecStatus.DRAFT);
        updateById(spec);

        saveVersion(spec, "回滚至版本 " + version);

        return toDetailResponse(spec);
    }

    @Override
    @Transactional
    public void deleteSpec(Long id) {
        Spec spec = getById(id);
        if (spec == null) {
            throw new BusinessException(ResultCode.SPEC_NOT_FOUND);
        }
        if (spec.getStatus() == SpecStatus.ACTIVE) {
            throw new BusinessException(ResultCode.SPEC_STATUS_INVALID.getCode(), "已生效的规范不能直接删除，请先废弃");
        }
        removeById(id);
    }

    @Override
    public void updateEmbedding(Long specId, float[] embedding) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < embedding.length; i++) {
            if (i > 0) sb.append(",");
            sb.append(embedding[i]);
        }
        sb.append("]");
        baseMapper.updateEmbedding(specId, sb.toString());
    }

    private void saveVersion(Spec spec, String changeLog) {
        SpecVersion version = new SpecVersion();
        version.setSpecId(spec.getId());
        version.setVersion(spec.getCurrentVersion());
        version.setTitle(spec.getTitle());
        version.setContent(spec.getContent());
        version.setTags(spec.getTags());
        version.setKeywords(spec.getKeywords());
        version.setChangeLog(changeLog);
        version.setCreatedBy(spec.getCreatedBy());
        specVersionMapper.insert(version);
    }

    private SpecDetailResponse toDetailResponse(Spec spec) {
        SpecDetailResponse response = new SpecDetailResponse();
        BeanUtils.copyProperties(spec, response);
        if (StringUtils.hasText(spec.getTags())) {
            response.setTags(Arrays.asList(spec.getTags().split(",")));
        }
        if (spec.getCategoryId() != null) {
            SpecCategory category = specCategoryMapper.selectById(spec.getCategoryId());
            if (category != null) {
                response.setCategoryName(category.getName());
            }
        }
        return response;
    }
}
