package com.steeringhub.steering.dto.request;

import com.steeringhub.domain.model.steering.ReviewAction;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ReviewSteeringRequest {

    @NotNull(message = "审核动作不能为空")
    private ReviewAction action;

    private String comment;
}
