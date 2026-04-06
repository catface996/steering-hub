package com.steeringhub.application.impl;

import com.steeringhub.application.api.dto.request.CategoryHierarchyDeleteRequest;
import com.steeringhub.application.api.dto.request.CategoryHierarchyRequest;
import com.steeringhub.application.api.dto.request.CreateCategoryRequest;
import com.steeringhub.application.api.dto.response.CategoryChildCountVO;
import com.steeringhub.application.api.dto.response.CategoryNavItem;
import com.steeringhub.application.api.dto.response.CategoryVO;
import com.steeringhub.application.api.dto.response.SteeringNavItem;
import com.steeringhub.application.api.service.CategoryApplicationService;
import com.steeringhub.common.exception.BusinessException;
import com.steeringhub.common.response.PageResult;
import com.steeringhub.common.response.ResultCode;
import com.steeringhub.domain.model.category.SteeringCategory;
import com.steeringhub.domain.service.CategoryDomainService;
import com.steeringhub.repository.CategoryHierarchyRepository;
import com.steeringhub.repository.CategoryRepository;
import com.steeringhub.repository.SteeringRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CategoryApplicationServiceImpl implements CategoryApplicationService {

    private final CategoryDomainService categoryDomainService;
    private final CategoryRepository categoryRepository;
    private final CategoryHierarchyRepository categoryHierarchyRepository;
    private final SteeringRepository steeringRepository;

    @Override
    @Transactional(readOnly = true)
    public List<CategoryVO> listTree() {
        return categoryRepository.findAllEnabled().stream()
                .map(this::toCategoryVO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public CategoryVO createCategory(CreateCategoryRequest request) {
        log.info("createCategory name={}", request.getName());

        String code = request.getCode();
        if (code == null || code.isBlank()) {
            code = "cat-" + System.currentTimeMillis();
        }
        categoryDomainService.validateCodeUnique(code);

        SteeringCategory category = new SteeringCategory();
        category.setName(request.getName());
        category.setCode(code);
        category.setDescription(request.getDescription());
        category.setParentId(request.getParentId());
        category.setSortOrder(0);
        category.setEnabled(true);
        categoryRepository.save(category);

        if (request.getParentId() != null) {
            categoryHierarchyRepository.insertRelation(request.getParentId(), category.getId(), 0);
        }

        log.info("createCategory success id={}", category.getId());
        return toCategoryVO(category);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public CategoryVO updateCategory(Long id, String name, String description) {
        log.info("updateCategory id={}", id);
        SteeringCategory category = getCategoryOrThrow(id);
        category.setName(name);
        category.setDescription(description);
        categoryRepository.update(category);
        return toCategoryVO(category);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteCategory(Long id) {
        log.info("deleteCategory id={}", id);
        getCategoryOrThrow(id);
        categoryRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CategoryNavItem> listCategories(Long parentId) {
        List<Long> childIds;
        if (parentId == null || parentId == 0) {
            // Top-level: categories with no parent
            return categoryRepository.findByParentId(null).stream()
                    .map(this::toNavItem)
                    .collect(Collectors.toList());
        }
        childIds = categoryHierarchyRepository.findChildIds(parentId);
        return childIds.stream()
                .map(categoryRepository::getById)
                .filter(c -> c != null)
                .map(this::toNavItem)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<SteeringNavItem> listSteerings(Long categoryId, int limit) {
        int clampedLimit = Math.max(1, Math.min(50, limit));
        com.steeringhub.repository.query.SteeringQuery query = new com.steeringhub.repository.query.SteeringQuery();
        query.setCategoryId(categoryId);
        query.setStatus(com.steeringhub.domain.model.steering.SteeringStatus.ACTIVE);
        PageResult<com.steeringhub.domain.model.steering.Steering> page =
                steeringRepository.page(query, 1, clampedLimit);
        return page.getRecords().stream().map(s -> {
            SteeringNavItem item = new SteeringNavItem();
            item.setId(s.getId());
            item.setTitle(s.getTitle());
            item.setTags(s.getTags());
            item.setUpdatedAt(s.getUpdatedAt());
            return item;
        }).collect(Collectors.toList());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void addHierarchy(CategoryHierarchyRequest request) {
        log.info("addHierarchy parent={} child={}", request.getParentCategoryId(), request.getChildCategoryId());
        categoryDomainService.validateHierarchy(request.getParentCategoryId(), request.getChildCategoryId());
        categoryHierarchyRepository.insertRelation(
                request.getParentCategoryId(),
                request.getChildCategoryId(),
                request.getSortOrder() != null ? request.getSortOrder() : 0);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void removeHierarchy(CategoryHierarchyDeleteRequest request) {
        log.info("removeHierarchy parent={} child={}", request.getParentCategoryId(), request.getChildCategoryId());
        categoryHierarchyRepository.deleteRelation(request.getParentCategoryId(), request.getChildCategoryId());
    }

    @Override
    @Transactional(readOnly = true)
    public CategoryChildCountVO countDirectChildren(Long categoryId) {
        int count = categoryRepository.countDirectChildren(categoryId);
        return new CategoryChildCountVO(categoryId, count);
    }

    // --- private helpers ---

    private SteeringCategory getCategoryOrThrow(Long id) {
        SteeringCategory category = categoryRepository.getById(id);
        if (category == null) {
            throw new BusinessException(ResultCode.CATEGORY_NOT_FOUND);
        }
        return category;
    }

    private CategoryVO toCategoryVO(SteeringCategory c) {
        CategoryVO vo = new CategoryVO();
        vo.setId(c.getId());
        vo.setName(c.getName());
        vo.setCode(c.getCode());
        vo.setDescription(c.getDescription());
        vo.setParentId(c.getParentId());
        vo.setSortOrder(c.getSortOrder());
        vo.setEnabled(c.getEnabled());
        vo.setCreatedAt(c.getCreatedAt());
        vo.setUpdatedAt(c.getUpdatedAt());
        return vo;
    }

    private CategoryNavItem toNavItem(SteeringCategory c) {
        CategoryNavItem item = new CategoryNavItem();
        item.setId(c.getId());
        item.setName(c.getName());
        item.setCode(c.getCode());
        item.setDescription(c.getDescription());
        item.setChildCount(categoryRepository.countDirectChildren(c.getId()));
        item.setSortOrder(c.getSortOrder());
        return item;
    }
}
