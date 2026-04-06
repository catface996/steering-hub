package com.steeringhub.repository.postgres;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.steeringhub.common.response.PageResult;
import com.steeringhub.domain.model.search.SteeringQueryLog;
import com.steeringhub.repository.SteeringQueryLogRepository;
import com.steeringhub.repository.postgres.mapper.SteeringQueryLogPOMapper;
import com.steeringhub.repository.postgres.po.SteeringQueryLogPO;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.stream.Collectors;

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
    public void update(SteeringQueryLog log) {
        mapper.updateById(toPO(log));
    }

    @Override
    public int countWeeklySearches() {
        return mapper.countWeeklySearches();
    }

    @Override
    public SteeringQueryLog getById(Long id) {
        SteeringQueryLogPO po = mapper.selectById(id);
        return po != null ? toEntity(po) : null;
    }

    @Override
    public PageResult<SteeringQueryLog> page(String query, String startDate, String endDate, int page, int size) {
        LambdaQueryWrapper<SteeringQueryLogPO> wrapper = new LambdaQueryWrapper<>();
        if (query != null && !query.isBlank()) {
            wrapper.like(SteeringQueryLogPO::getQueryText, query);
        }
        if (startDate != null && !startDate.isBlank()) {
            wrapper.ge(SteeringQueryLogPO::getCreatedAt,
                    LocalDate.parse(startDate).atStartOfDay().atOffset(ZoneOffset.UTC));
        }
        if (endDate != null && !endDate.isBlank()) {
            wrapper.le(SteeringQueryLogPO::getCreatedAt,
                    LocalDate.parse(endDate).plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC));
        }

        long total = mapper.selectCount(wrapper);

        wrapper.orderByDesc(SteeringQueryLogPO::getCreatedAt)
                .last("LIMIT " + size + " OFFSET " + (long) (page - 1) * size);
        List<SteeringQueryLog> records = mapper.selectList(wrapper).stream()
                .map(this::toEntity).collect(Collectors.toList());

        return PageResult.of(records, total, page, size);
    }

    @Override
    public List<SteeringQueryLog> findFailureLogs(int days, int limit) {
        OffsetDateTime since = OffsetDateTime.now().minusDays(days);
        return mapper.selectList(
                new LambdaQueryWrapper<SteeringQueryLogPO>()
                        .eq(SteeringQueryLogPO::getIsEffective, false)
                        .ge(SteeringQueryLogPO::getCreatedAt, since)
                        .orderByDesc(SteeringQueryLogPO::getCreatedAt)
                        .last("LIMIT " + limit))
                .stream().map(this::toEntity).collect(Collectors.toList());
    }

    private SteeringQueryLogPO toPO(SteeringQueryLog entity) {
        SteeringQueryLogPO po = new SteeringQueryLogPO();
        BeanUtils.copyProperties(entity, po);
        return po;
    }

    private SteeringQueryLog toEntity(SteeringQueryLogPO po) {
        SteeringQueryLog entity = new SteeringQueryLog();
        BeanUtils.copyProperties(po, entity);
        return entity;
    }
}
