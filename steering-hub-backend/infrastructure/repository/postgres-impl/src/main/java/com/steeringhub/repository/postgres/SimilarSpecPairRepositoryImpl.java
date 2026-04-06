package com.steeringhub.repository.postgres;

import com.steeringhub.domain.model.health.SimilarSpecPair;
import com.steeringhub.repository.SimilarSpecPairRepository;
import com.steeringhub.repository.postgres.mapper.SimilarSpecPairPOMapper;
import com.steeringhub.repository.postgres.po.SimilarSpecPairPO;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.stream.Collectors;

@Repository
@RequiredArgsConstructor
public class SimilarSpecPairRepositoryImpl implements SimilarSpecPairRepository {

    private final SimilarSpecPairPOMapper mapper;

    @Override
    public void batchSave(List<SimilarSpecPair> pairs) {
        List<SimilarSpecPairPO> poList = pairs.stream().map(this::toPO).collect(Collectors.toList());
        mapper.batchInsert(poList);
    }

    @Override
    public long countByTaskIdFiltered(Long taskId, String specTitle, Long categoryId) {
        return mapper.countByTaskIdFiltered(taskId, specTitle, categoryId);
    }

    private SimilarSpecPairPO toPO(SimilarSpecPair entity) {
        SimilarSpecPairPO po = new SimilarSpecPairPO();
        BeanUtils.copyProperties(entity, po);
        return po;
    }
}
