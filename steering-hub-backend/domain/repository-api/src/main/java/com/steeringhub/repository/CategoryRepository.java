package com.steeringhub.repository;

import com.steeringhub.domain.model.category.SteeringCategory;

import java.util.List;

public interface CategoryRepository {

    SteeringCategory getById(Long id);

    List<SteeringCategory> findByParentId(Long parentId);

    List<SteeringCategory> findAllEnabled();

    SteeringCategory findByCode(String code);

    int countByCode(String code);

    int countDirectChildren(Long categoryId);

    void save(SteeringCategory category);

    void update(SteeringCategory category);

    void deleteById(Long id);
}
