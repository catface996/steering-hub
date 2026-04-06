package com.steeringhub.domain.impl.service;

import com.steeringhub.common.exception.BusinessException;
import com.steeringhub.common.response.ResultCode;
import com.steeringhub.domain.service.CategoryDomainService;
import com.steeringhub.repository.CategoryHierarchyRepository;
import com.steeringhub.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class CategoryDomainServiceImpl implements CategoryDomainService {

    private final CategoryHierarchyRepository categoryHierarchyRepository;
    private final CategoryRepository categoryRepository;

    @Override
    public void validateHierarchy(Long parentId, Long childId) {
        if (parentId.equals(childId)) {
            throw new BusinessException(ResultCode.BAD_REQUEST.getCode(), "SELF_LOOP: parent 与 child 相同");
        }
        Set<Long> descendants = new HashSet<>(categoryHierarchyRepository.findAllDescendantIds(childId));
        if (descendants.contains(parentId)) {
            throw new BusinessException(ResultCode.BAD_REQUEST.getCode(), "CYCLE_DETECTED: 添加此关系将形成环，操作已拒绝");
        }
    }

    @Override
    public void validateCodeUnique(String code) {
        if (categoryRepository.countByCode(code) > 0) {
            throw new BusinessException(ResultCode.CONFLICT.getCode(), "分类编码已存在: " + code);
        }
    }
}
