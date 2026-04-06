package com.steeringhub.repository.postgres;

import com.steeringhub.domain.model.category.SteeringCategory;
import com.steeringhub.repository.CategoryRepository;
import com.steeringhub.repository.postgres.mapper.SteeringCategoryPOMapper;
import com.steeringhub.repository.postgres.po.SteeringCategoryPO;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.stream.Collectors;

@Repository
@RequiredArgsConstructor
public class CategoryRepositoryImpl implements CategoryRepository {

    private final SteeringCategoryPOMapper mapper;

    @Override
    public SteeringCategory getById(Long id) {
        SteeringCategoryPO po = mapper.selectById(id);
        return po == null ? null : toEntity(po);
    }

    @Override
    public List<SteeringCategory> findByParentId(Long parentId) {
        return mapper.selectTreeByParentId(parentId)
                .stream().map(this::toEntity).collect(Collectors.toList());
    }

    @Override
    public List<SteeringCategory> findAllEnabled() {
        return mapper.selectAllEnabled()
                .stream().map(this::toEntity).collect(Collectors.toList());
    }

    @Override
    public SteeringCategory findByCode(String code) {
        SteeringCategoryPO po = mapper.selectByCode(code);
        return po == null ? null : toEntity(po);
    }

    @Override
    public int countByCode(String code) {
        return mapper.countByCode(code);
    }

    @Override
    public int countDirectChildren(Long categoryId) {
        return mapper.countDirectChildren(categoryId);
    }

    @Override
    public void save(SteeringCategory category) {
        SteeringCategoryPO po = toPO(category);
        mapper.insert(po);
        category.setId(po.getId());
    }

    @Override
    public void update(SteeringCategory category) {
        mapper.updateById(toPO(category));
    }

    @Override
    public void deleteById(Long id) {
        mapper.deleteById(id);
    }

    private SteeringCategory toEntity(SteeringCategoryPO po) {
        SteeringCategory entity = new SteeringCategory();
        BeanUtils.copyProperties(po, entity);
        return entity;
    }

    private SteeringCategoryPO toPO(SteeringCategory entity) {
        SteeringCategoryPO po = new SteeringCategoryPO();
        BeanUtils.copyProperties(entity, po);
        return po;
    }
}
