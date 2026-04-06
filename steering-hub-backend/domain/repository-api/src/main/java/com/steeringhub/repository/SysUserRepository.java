package com.steeringhub.repository;

import com.steeringhub.domain.model.auth.SysUser;

public interface SysUserRepository {

    SysUser findByUsername(String username);

    void save(SysUser user);

    void update(SysUser user);
}
