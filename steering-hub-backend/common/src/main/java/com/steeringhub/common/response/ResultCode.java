package com.steeringhub.common.response;

import lombok.Getter;

@Getter
public enum ResultCode {

    SUCCESS(200, "操作成功"),
    BAD_REQUEST(400, "请求参数错误"),
    UNAUTHORIZED(401, "未授权"),
    FORBIDDEN(403, "无权限"),
    NOT_FOUND(404, "资源不存在"),
    CONFLICT(409, "资源冲突"),
    INTERNAL_ERROR(500, "服务器内部错误"),

    // Steering module
    STEERING_NOT_FOUND(1001, "规范不存在"),
    STEERING_STATUS_INVALID(1002, "规范状态不合法"),
    STEERING_VERSION_CONFLICT(1003, "版本冲突"),
    CATEGORY_NOT_FOUND(1004, "规范分类不存在"),

    // Search module
    EMBEDDING_FAILED(2001, "向量化失败"),
    SEARCH_FAILED(2002, "检索失败"),

    // Compliance module
    COMPLIANCE_CHECK_FAILED(3001, "合规检查失败"),
    REPO_NOT_FOUND(3002, "代码仓库不存在");

    private final Integer code;
    private final String message;

    ResultCode(Integer code, String message) {
        this.code = code;
        this.message = message;
    }
}
