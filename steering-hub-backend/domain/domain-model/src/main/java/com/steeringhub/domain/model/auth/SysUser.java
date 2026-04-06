package com.steeringhub.domain.model.auth;

import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class SysUser {

    private Long id;
    private String username;
    private String password;
    private String nickname;
    private String role;
    private Boolean enabled;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
