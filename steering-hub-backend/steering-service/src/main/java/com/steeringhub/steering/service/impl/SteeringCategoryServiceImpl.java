package com.steeringhub.steering.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.steeringhub.common.exception.BusinessException;
import com.steeringhub.common.response.ResultCode;
import com.steeringhub.steering.entity.SteeringCategory;
import com.steeringhub.steering.mapper.SteeringCategoryMapper;
import com.steeringhub.steering.service.SteeringCategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SteeringCategoryServiceImpl extends ServiceImpl<SteeringCategoryMapper, SteeringCategory>
        implements SteeringCategoryService {

    @Override
    public List<SteeringCategory> listTree() {
        return baseMapper.selectAllEnabled();
    }

    @Override
    @Transactional
    public SteeringCategory createCategory(String name, String code, String description, Long parentId) {
        // Auto-generate code when not provided
        if (code == null || code.isBlank()) {
            code = "cat-" + System.currentTimeMillis();
        }
        // Check code uniqueness
        int count = baseMapper.countByCode(code);
        if (count > 0) {
            throw new BusinessException(ResultCode.CONFLICT.getCode(), "分类编码已存在: " + code);
        }
        SteeringCategory category = new SteeringCategory();
        category.setName(name);
        category.setCode(code);
        category.setDescription(description);
        category.setParentId(parentId);
        category.setSortOrder(0);
        category.setEnabled(true);
        save(category);
        return category;
    }

    @Override
    @Transactional
    public SteeringCategory updateCategory(Long id, String name, String description) {
        SteeringCategory category = getById(id);
        if (category == null) {
            throw new BusinessException(ResultCode.CATEGORY_NOT_FOUND);
        }
        category.setName(name);
        category.setDescription(description);
        updateById(category);
        return category;
    }

    @Override
    @Transactional
    public void deleteCategory(Long id) {
        SteeringCategory category = getById(id);
        if (category == null) {
            throw new BusinessException(ResultCode.CATEGORY_NOT_FOUND);
        }
        removeById(id);
    }
}
