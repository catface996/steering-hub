package com.steeringhub.repository.postgres;

import com.steeringhub.domain.model.steering.SteeringReview;
import com.steeringhub.repository.SteeringReviewRepository;
import com.steeringhub.repository.postgres.mapper.SteeringReviewPOMapper;
import com.steeringhub.repository.postgres.po.SteeringReviewPO;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.stream.Collectors;

@Repository
@RequiredArgsConstructor
public class SteeringReviewRepositoryImpl implements SteeringReviewRepository {

    private final SteeringReviewPOMapper mapper;

    @Override
    public List<SteeringReview> findBySteeringId(Long steeringId) {
        return mapper.selectBySteeringId(steeringId)
                .stream().map(this::toEntity).collect(Collectors.toList());
    }

    @Override
    public void save(SteeringReview review) {
        SteeringReviewPO po = toPO(review);
        mapper.insert(po);
        review.setId(po.getId());
    }

    private SteeringReview toEntity(SteeringReviewPO po) {
        SteeringReview entity = new SteeringReview();
        BeanUtils.copyProperties(po, entity);
        return entity;
    }

    private SteeringReviewPO toPO(SteeringReview entity) {
        SteeringReviewPO po = new SteeringReviewPO();
        BeanUtils.copyProperties(entity, po);
        return po;
    }
}
