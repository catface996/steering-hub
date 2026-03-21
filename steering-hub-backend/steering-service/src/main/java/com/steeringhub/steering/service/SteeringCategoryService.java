package com.steeringhub.steering.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.steeringhub.steering.entity.SteeringCategory;

import java.util.List;

public interface SteeringCategoryService extends IService<SteeringCategory> {

    List<SteeringCategory> listTree();

    SteeringCategory createCategory(String name, String code, String description, Long parentId);

    SteeringCategory updateCategory(Long id, String name, String description);

    void deleteCategory(Long id);
}
