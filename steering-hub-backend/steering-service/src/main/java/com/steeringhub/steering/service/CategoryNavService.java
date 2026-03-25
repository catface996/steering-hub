package com.steeringhub.steering.service;

import com.steeringhub.steering.dto.response.CategoryNavItem;
import com.steeringhub.steering.dto.response.SteeringNavItem;

import java.util.List;

public interface CategoryNavService {

    List<CategoryNavItem> listCategories(Long parentId);

    List<SteeringNavItem> listSteerings(Long categoryId, int limit);

    void addHierarchy(Long parentId, Long childId, int sortOrder);

    void removeHierarchy(Long parentId, Long childId);
}
