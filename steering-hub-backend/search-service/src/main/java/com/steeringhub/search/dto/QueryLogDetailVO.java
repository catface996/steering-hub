package com.steeringhub.search.dto;

import com.steeringhub.steering.entity.SteeringQueryLog;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.util.List;

@Data
@EqualsAndHashCode(callSuper = true)
public class QueryLogDetailVO extends SteeringQueryLog {
    private List<HitSteeringVO> hitSteerings;
}
