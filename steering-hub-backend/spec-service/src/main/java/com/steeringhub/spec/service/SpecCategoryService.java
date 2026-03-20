package com.steeringhub.spec.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.steeringhub.spec.entity.SpecCategory;

import java.util.List;

public interface SpecCategoryService extends IService<SpecCategory> {

    List<SpecCategory> listTree();

    SpecCategory createCategory(String name, String code, String description, Long parentId);

    SpecCategory updateCategory(Long id, String name, String description);

    void deleteCategory(Long id);
}
