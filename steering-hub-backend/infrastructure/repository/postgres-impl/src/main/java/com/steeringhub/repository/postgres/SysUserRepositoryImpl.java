package com.steeringhub.repository.postgres;

import com.steeringhub.domain.model.auth.SysUser;
import com.steeringhub.repository.SysUserRepository;
import com.steeringhub.repository.postgres.mapper.SysUserPOMapper;
import com.steeringhub.repository.postgres.po.SysUserPO;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class SysUserRepositoryImpl implements SysUserRepository {

    private final SysUserPOMapper mapper;

    @Override
    public SysUser findByUsername(String username) {
        SysUserPO po = mapper.findByUsername(username);
        return po == null ? null : toEntity(po);
    }

    @Override
    public void save(SysUser user) {
        SysUserPO po = toPO(user);
        mapper.insert(po);
        user.setId(po.getId());
    }

    @Override
    public void update(SysUser user) {
        mapper.updateById(toPO(user));
    }

    private SysUser toEntity(SysUserPO po) {
        SysUser entity = new SysUser();
        BeanUtils.copyProperties(po, entity);
        return entity;
    }

    private SysUserPO toPO(SysUser entity) {
        SysUserPO po = new SysUserPO();
        BeanUtils.copyProperties(entity, po);
        return po;
    }
}
