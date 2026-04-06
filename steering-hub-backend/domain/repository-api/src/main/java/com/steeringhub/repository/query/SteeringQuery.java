package com.steeringhub.repository.query;

import com.steeringhub.domain.model.steering.SteeringStatus;
import lombok.Data;

@Data
public class SteeringQuery {

    private SteeringStatus status;
    private Long categoryId;
    private String keyword;
}
