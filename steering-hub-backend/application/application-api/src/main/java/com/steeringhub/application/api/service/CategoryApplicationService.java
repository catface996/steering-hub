package com.steeringhub.application.api.service;

import com.steeringhub.application.api.dto.request.CategoryHierarchyDeleteRequest;
import com.steeringhub.application.api.dto.request.CategoryHierarchyRequest;
import com.steeringhub.application.api.dto.request.CreateCategoryRequest;
import com.steeringhub.application.api.dto.response.CategoryChildCountVO;
import com.steeringhub.application.api.dto.response.CategoryNavItem;
import com.steeringhub.application.api.dto.response.CategoryVO;
import com.steeringhub.application.api.dto.response.SteeringNavItem;

import java.util.List;

/**
 * 分类管理 + DAG 导航应用服务
 */
public interface CategoryApplicationService {

    List<CategoryVO> listTree();

    CategoryVO createCategory(CreateCategoryRequest request);

    CategoryVO updateCategory(Long id, String name, String description);

    void deleteCategory(Long id);

    List<CategoryNavItem> listCategories(Long parentId);

    List<SteeringNavItem> listSteerings(Long categoryId, int limit);

    void addHierarchy(CategoryHierarchyRequest request);

    void removeHierarchy(CategoryHierarchyDeleteRequest request);

    CategoryChildCountVO countDirectChildren(Long categoryId);
}
