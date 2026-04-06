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
    public List<SimilarSpecPair> findByTaskIdPaged(Long taskId, int offset, int pageSize, String specTitle, Long categoryId) {
        return mapper.findByTaskIdPaged(taskId, offset, pageSize, specTitle, categoryId)
                .stream().map(this::toDomain).collect(Collectors.toList());
    }

    @Override
    public long countByTaskIdFiltered(Long taskId, String specTitle, Long categoryId) {
        return mapper.countByTaskIdFiltered(taskId, specTitle, categoryId);
    }

    @Override
    public void deleteById(Long pairId) {
        mapper.deleteById(pairId);
    }

    private SimilarSpecPairPO toPO(SimilarSpecPair entity) {
        SimilarSpecPairPO po = new SimilarSpecPairPO();
        BeanUtils.copyProperties(entity, po);
        return po;
    }

    private SimilarSpecPair toDomain(SimilarSpecPairPO po) {
        SimilarSpecPair entity = new SimilarSpecPair();
        BeanUtils.copyProperties(po, entity);
        return entity;
    }
}
