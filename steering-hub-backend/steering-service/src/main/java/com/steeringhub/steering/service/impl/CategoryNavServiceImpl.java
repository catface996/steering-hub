package com.steeringhub.steering.service.impl;

import com.steeringhub.common.exception.BusinessException;
import com.steeringhub.common.response.ResultCode;
import com.steeringhub.steering.dto.response.CategoryChildCountVO;
import com.steeringhub.steering.dto.response.CategoryNavItem;
import com.steeringhub.steering.dto.response.SteeringNavItem;
import com.steeringhub.steering.mapper.CategoryHierarchyMapper;
import com.steeringhub.steering.mapper.SteeringCategoryMapper;
import com.steeringhub.steering.mapper.SteeringMapper;
import com.steeringhub.steering.service.CategoryNavService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Queue;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class CategoryNavServiceImpl implements CategoryNavService {

    private final CategoryHierarchyMapper categoryHierarchyMapper;
    private final SteeringCategoryMapper steeringCategoryMapper;
    private final SteeringMapper steeringMapper;

    @Override
    public List<CategoryNavItem> listCategories(Long parentId) {
        if (parentId == null || parentId == 0) {
            return steeringCategoryMapper.listTopLevel();
        }
        return steeringCategoryMapper.listChildren(parentId);
    }

    @Override
    public List<SteeringNavItem> listSteerings(Long categoryId, int limit) {
        int clampedLimit = Math.max(1, Math.min(50, limit));
        return steeringMapper.listActiveByCategory(categoryId, clampedLimit);
    }

    @Override
    @Transactional
    public void addHierarchy(Long parentId, Long childId, int sortOrder) {
        if (parentId.equals(childId)) {
            throw new BusinessException(ResultCode.BAD_REQUEST.getCode(), "SELF_LOOP: parent 与 child 相同");
        }
        Set<Long> descendants = getAllDescendants(childId);
        if (descendants.contains(parentId)) {
            throw new BusinessException(ResultCode.BAD_REQUEST.getCode(), "CYCLE_DETECTED: 添加此关系将形成环，操作已拒绝");
        }
        categoryHierarchyMapper.insertRelation(parentId, childId, sortOrder);
    }

    @Override
    public void removeHierarchy(Long parentId, Long childId) {
        categoryHierarchyMapper.deleteRelation(parentId, childId);
    }

    @Override
    public CategoryChildCountVO countDirectChildren(Long categoryId) {
        int count = steeringCategoryMapper.countDirectChildren(categoryId);
        return new CategoryChildCountVO(categoryId, count);
    }

    private Set<Long> getAllDescendants(Long rootId) {
        Set<Long> visited = new HashSet<>();
        Queue<Long> queue = new LinkedList<>();
        queue.add(rootId);
        while (!queue.isEmpty()) {
            Long cur = queue.poll();
            if (!visited.add(cur)) {
                continue;
            }
            List<Long> children = categoryHierarchyMapper.selectChildIds(cur);
            queue.addAll(children);
        }
        return visited;
    }
}
