package com.steeringhub.repository.postgres;

import com.steeringhub.repository.CategoryHierarchyRepository;
import com.steeringhub.repository.postgres.mapper.CategoryHierarchyPOMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
@RequiredArgsConstructor
public class CategoryHierarchyRepositoryImpl implements CategoryHierarchyRepository {

    private final CategoryHierarchyPOMapper mapper;

    @Override
    public void insertRelation(Long parentId, Long childId, int sortOrder) {
        mapper.insertRelation(parentId, childId, sortOrder);
    }

    @Override
    public void deleteRelation(Long parentId, Long childId) {
        mapper.deleteRelation(parentId, childId);
    }

    @Override
    public List<Long> findChildIds(Long parentId) {
        return mapper.selectChildIds(parentId);
    }

    @Override
    public List<Long> findAllDescendantIds(Long rootId) {
        return mapper.selectAllDescendantIds(rootId);
    }
}
