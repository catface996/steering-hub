package com.steeringhub.spec.dto.request;

import com.steeringhub.common.enums.ReviewAction;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ReviewSpecRequest {

    @NotNull(message = "审核动作不能为空")
    private ReviewAction action;

    private String comment;
}
