package com.steeringhub.domain.model.steering;

import lombok.Getter;

@Getter
public enum ReviewAction {

    SUBMIT("submit", "提交审核"),
    APPROVE("approve", "审核通过"),
    REJECT("reject", "驳回"),
    ACTIVATE("activate", "生效"),
    DEPRECATE("deprecate", "废弃"),
    ROLLBACK("rollback", "回滚"),
    WITHDRAW("withdraw", "撤回");

    private final String code;
    private final String description;

    ReviewAction(String code, String description) {
        this.code = code;
        this.description = description;
    }
}
