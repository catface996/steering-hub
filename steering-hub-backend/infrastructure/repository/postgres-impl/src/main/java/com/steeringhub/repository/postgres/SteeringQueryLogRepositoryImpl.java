package com.steeringhub.repository.postgres;

import com.steeringhub.domain.model.search.SteeringQueryLog;
import com.steeringhub.repository.SteeringQueryLogRepository;
import com.steeringhub.repository.postgres.mapper.SteeringQueryLogPOMapper;
import com.steeringhub.repository.postgres.po.SteeringQueryLogPO;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class SteeringQueryLogRepositoryImpl implements SteeringQueryLogRepository {

    private final SteeringQueryLogPOMapper mapper;

    @Override
    public void save(SteeringQueryLog log) {
        SteeringQueryLogPO po = toPO(log);
        mapper.insert(po);
        log.setId(po.getId());
    }

    @Override
    public int countWeeklySearches() {
        return mapper.countWeeklySearches();
    }

    private SteeringQueryLogPO toPO(SteeringQueryLog entity) {
        SteeringQueryLogPO po = new SteeringQueryLogPO();
        BeanUtils.copyProperties(entity, po);
        return po;
    }
}
