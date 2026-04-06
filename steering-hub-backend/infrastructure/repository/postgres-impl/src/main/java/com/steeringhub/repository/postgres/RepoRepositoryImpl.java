package com.steeringhub.repository.postgres;

import com.steeringhub.common.response.PageResult;
import com.steeringhub.domain.model.repo.Repo;
import com.steeringhub.repository.RepoRepository;
import com.steeringhub.repository.postgres.mapper.RepoPOMapper;
import com.steeringhub.repository.postgres.po.RepoPO;
import com.steeringhub.repository.query.RepoQuery;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.stream.Collectors;

@Repository
@RequiredArgsConstructor
public class RepoRepositoryImpl implements RepoRepository {

    private final RepoPOMapper mapper;

    @Override
    public Repo getById(Long id) {
        RepoPO po = mapper.selectById(id);
        return po == null ? null : toEntity(po);
    }

    @Override
    public PageResult<Repo> page(RepoQuery query, int page, int size) {
        int offset = (page - 1) * size;
        long total = mapper.countByCondition(query.getName(), query.getTeam(), query.getEnabled());
        List<RepoPO> list = mapper.listByCondition(query.getName(), query.getTeam(), query.getEnabled(), offset, size);
        return PageResult.of(list.stream().map(this::toEntity).collect(Collectors.toList()),
                total, page, size);
    }

    @Override
    public Repo findByFullNameIncludeDeleted(String fullName) {
        RepoPO po = mapper.findByFullNameIncludeDeleted(fullName);
        return po == null ? null : toEntity(po);
    }

    @Override
    public Repo findEnabledByFullName(String fullName) {
        RepoPO po = mapper.findEnabledByFullName(fullName);
        return po == null ? null : toEntity(po);
    }

    @Override
    public void save(Repo repo) {
        RepoPO po = toPO(repo);
        mapper.insert(po);
        repo.setId(po.getId());
    }

    @Override
    public void update(Repo repo) {
        mapper.updateById(toPO(repo));
    }

    @Override
    public void deleteById(Long id) {
        mapper.deleteById(id);
    }

    private Repo toEntity(RepoPO po) {
        Repo entity = new Repo();
        BeanUtils.copyProperties(po, entity);
        return entity;
    }

    private RepoPO toPO(Repo entity) {
        RepoPO po = new RepoPO();
        BeanUtils.copyProperties(entity, po);
        return po;
    }
}
