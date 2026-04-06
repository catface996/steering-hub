package com.steeringhub.repository.postgres;

import com.steeringhub.domain.model.search.StopWord;
import com.steeringhub.repository.StopWordRepository;
import com.steeringhub.repository.postgres.mapper.StopWordPOMapper;
import com.steeringhub.repository.postgres.po.StopWordPO;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.stream.Collectors;

@Repository
@RequiredArgsConstructor
public class StopWordRepositoryImpl implements StopWordRepository {

    private final StopWordPOMapper mapper;

    @Override
    public List<StopWord> findAllEnabled() {
        return mapper.findAllEnabled()
                .stream().map(this::toEntity).collect(Collectors.toList());
    }

    @Override
    public List<StopWord> findAllOrderByWord() {
        return mapper.findAllOrderByWord()
                .stream().map(this::toEntity).collect(Collectors.toList());
    }

    @Override
    public void save(StopWord stopWord) {
        StopWordPO po = toPO(stopWord);
        mapper.insert(po);
        stopWord.setId(po.getId());
    }

    @Override
    public StopWord getById(Long id) {
        StopWordPO po = mapper.selectById(id);
        return po == null ? null : toEntity(po);
    }

    @Override
    public void update(StopWord stopWord) {
        mapper.updateById(toPO(stopWord));
    }

    @Override
    public void deleteById(Long id) {
        mapper.deleteById(id);
    }

    private StopWord toEntity(StopWordPO po) {
        StopWord entity = new StopWord();
        BeanUtils.copyProperties(po, entity);
        return entity;
    }

    private StopWordPO toPO(StopWord entity) {
        StopWordPO po = new StopWordPO();
        BeanUtils.copyProperties(entity, po);
        return po;
    }
}
