package com.steeringhub.steering.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.steeringhub.steering.entity.SysUser;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

/**
 * 系统用户 Mapper
 */
@Mapper
public interface SysUserMapper extends BaseMapper<SysUser> {

    SysUser findByUsername(@Param("username") String username);
}
