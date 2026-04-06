package com.steeringhub.repository;

import java.util.List;

public interface CategoryHierarchyRepository {

    void insertRelation(Long parentId, Long childId, int sortOrder);

    void deleteRelation(Long parentId, Long childId);

    List<Long> findChildIds(Long parentId);

    List<Long> findAllDescendantIds(Long rootId);
}
