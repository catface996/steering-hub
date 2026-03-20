package com.steeringhub.spec.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.steeringhub.common.exception.BusinessException;
import com.steeringhub.common.response.ResultCode;
import com.steeringhub.spec.entity.SpecCategory;
import com.steeringhub.spec.mapper.SpecCategoryMapper;
import com.steeringhub.spec.service.SpecCategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SpecCategoryServiceImpl extends ServiceImpl<SpecCategoryMapper, SpecCategory>
        implements SpecCategoryService {

    @Override
    public List<SpecCategory> listTree() {
        return list(new LambdaQueryWrapper<SpecCategory>()
                .eq(SpecCategory::getEnabled, true)
                .orderByAsc(SpecCategory::getSortOrder));
    }

    @Override
    @Transactional
    public SpecCategory createCategory(String name, String code, String description, Long parentId) {
        // Check code uniqueness
        long count = count(new LambdaQueryWrapper<SpecCategory>().eq(SpecCategory::getCode, code));
        if (count > 0) {
            throw new BusinessException(ResultCode.CONFLICT.getCode(), "分类编码已存在: " + code);
        }
        SpecCategory category = new SpecCategory();
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
    public SpecCategory updateCategory(Long id, String name, String description) {
        SpecCategory category = getById(id);
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
        SpecCategory category = getById(id);
        if (category == null) {
            throw new BusinessException(ResultCode.CATEGORY_NOT_FOUND);
        }
        removeById(id);
    }
}
