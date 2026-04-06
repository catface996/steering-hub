package com.steeringhub.repository;

import com.steeringhub.domain.model.steering.SteeringReview;

import java.util.List;

public interface SteeringReviewRepository {

    List<SteeringReview> findBySteeringId(Long steeringId);

    void save(SteeringReview review);
}
