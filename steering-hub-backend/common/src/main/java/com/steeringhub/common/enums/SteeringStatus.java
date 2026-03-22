package com.steeringhub.common.enums;

import com.baomidou.mybatisplus.annotation.EnumValue;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;

@Getter
public enum SteeringStatus {

    DRAFT("draft", "草稿"),
    PENDING_REVIEW("pending_review", "待审核"),
    APPROVED("approved", "已通过"),
    REJECTED("rejected", "已驳回"),
    ACTIVE("active", "已生效"),
    SUPERSEDED("superseded", "已被取代"),
    DEPRECATED("deprecated", "已废弃");

    @EnumValue
    @JsonValue
    private final String code;
    private final String description;

    SteeringStatus(String code, String description) {
        this.code = code;
        this.description = description;
    }

    public static SteeringStatus fromCode(String code) {
        for (SteeringStatus status : values()) {
            if (status.code.equals(code)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Unknown SteeringStatus code: " + code);
    }
}
