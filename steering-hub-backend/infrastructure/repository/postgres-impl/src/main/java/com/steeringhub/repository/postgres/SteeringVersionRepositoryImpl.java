package com.steeringhub.repository.postgres;

import com.steeringhub.common.response.PageResult;
import com.steeringhub.domain.model.steering.SteeringVersion;
import com.steeringhub.repository.SteeringVersionRepository;
import com.steeringhub.repository.postgres.mapper.SteeringVersionPOMapper;
import com.steeringhub.repository.postgres.po.SteeringVersionPO;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.stream.Collectors;

@Repository
@RequiredArgsConstructor
public class SteeringVersionRepositoryImpl implements SteeringVersionRepository {

    private final SteeringVersionPOMapper mapper;

    @Override
    public SteeringVersion getById(Long id) {
        SteeringVersionPO po = mapper.selectById(id);
        return po == null ? null : toEntity(po);
    }

    @Override
    public List<SteeringVersion> findBySteeringId(Long steeringId) {
        return mapper.selectBySteeringId(steeringId)
                .stream().map(this::toEntity).collect(Collectors.toList());
    }

    @Override
    public SteeringVersion findBySteeringIdAndVersion(Long steeringId, int version) {
        SteeringVersionPO po = mapper.selectBySteeringIdAndVersion(steeringId, version);
        return po == null ? null : toEntity(po);
    }

    @Override
    public Integer findMaxVersionBySteeringId(Long steeringId) {
        return mapper.selectMaxVersionBySteeringId(steeringId);
    }

    @Override
    public void save(SteeringVersion version) {
        SteeringVersionPO po = toPO(version);
        mapper.insert(po);
        version.setId(po.getId());
    }

    @Override
    public int updateVersionStatus(Long steeringId, String fromStatus, String toStatus) {
        return mapper.updateVersionStatus(steeringId, fromStatus, toStatus);
    }

    @Override
    public SteeringVersion findBySteeringIdAndStatus(Long steeringId, String status) {
        SteeringVersionPO po = mapper.findVersionBySteeringIdAndStatus(steeringId, status);
        return po == null ? null : toEntity(po);
    }

    @Override
    public PageResult<SteeringVersion> page(Long steeringId, int page, int size) {
        long offset = (long) (page - 1) * size;
        int total = mapper.countVersionsBySteeringId(steeringId);
        List<SteeringVersionPO> list = mapper.listVersionsBySteeringId(steeringId, offset, size);
        return PageResult.of(list.stream().map(this::toEntity).collect(Collectors.toList()),
                total, page, size);
    }

    @Override
    public int countBySteeringId(Long steeringId) {
        return mapper.countVersionsBySteeringId(steeringId);
    }

    private SteeringVersion toEntity(SteeringVersionPO po) {
        SteeringVersion entity = new SteeringVersion();
        BeanUtils.copyProperties(po, entity);
        return entity;
    }

    private SteeringVersionPO toPO(SteeringVersion entity) {
        SteeringVersionPO po = new SteeringVersionPO();
        BeanUtils.copyProperties(entity, po);
        return po;
    }
}
