package com.steeringhub.repository.postgres;

import com.steeringhub.common.response.PageResult;
import com.steeringhub.domain.model.steering.Steering;
import com.steeringhub.domain.model.steering.SteeringStatus;
import com.steeringhub.repository.SteeringRepository;
import com.steeringhub.repository.postgres.mapper.SteeringPOMapper;
import com.steeringhub.repository.postgres.po.SteeringPO;
import com.steeringhub.repository.query.SteeringQuery;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Repository;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Repository
@RequiredArgsConstructor
public class SteeringRepositoryImpl implements SteeringRepository {

    private final SteeringPOMapper mapper;

    @Override
    public Steering getById(Long id) {
        SteeringPO po = mapper.selectById(id);
        return po == null ? null : toEntity(po);
    }

    @Override
    public PageResult<Steering> page(SteeringQuery query, int page, int size) {
        int offset = (page - 1) * size;
        String statusCode = query.getStatus() != null ? query.getStatus().getCode() : null;
        long total = mapper.countByCondition(
                statusCode, query.getCategoryId(), query.getKeyword());
        List<SteeringPO> list = mapper.listByCondition(
                statusCode, query.getCategoryId(), query.getKeyword(), offset, size);
        return PageResult.of(list.stream().map(this::toEntity).collect(Collectors.toList()),
                total, page, size);
    }

    @Override
    public void save(Steering steering) {
        SteeringPO po = toPO(steering);
        mapper.insert(po);
        steering.setId(po.getId());
    }

    @Override
    public void update(Steering steering) {
        mapper.updateById(toPO(steering));
    }

    @Override
    public void deleteById(Long id) {
        mapper.deleteById(id);
    }

    @Override
    public List<Steering> vectorSearch(float[] embedding, int limit, Long categoryId) {
        String embeddingStr = toVectorString(embedding);
        return mapper.vectorSearch(embeddingStr, limit, categoryId)
                .stream().map(this::toEntity).collect(Collectors.toList());
    }

    @Override
    public List<Steering> fullTextSearch(String keyword, Long categoryId, int limit) {
        return mapper.fullTextSearch(keyword, categoryId, limit)
                .stream().map(this::toEntity).collect(Collectors.toList());
    }

    @Override
    public int updateEmbedding(Long steeringId, String embeddingStr) {
        return mapper.updateEmbedding(steeringId, embeddingStr);
    }

    @Override
    public int updateContentEmbedding(Long id, String vecStr) {
        return mapper.updateContentEmbedding(id, vecStr);
    }

    @Override
    public List<Steering> findTopKSimilarByContentEmbedding(Long excludeId, String vecStr, int limit) {
        return mapper.findTopKSimilarByContentEmbedding(excludeId, vecStr, limit)
                .stream().map(this::toEntity).collect(Collectors.toList());
    }

    @Override
    public List<Steering> findTopKSimilarBySpecId(Long specId, int limit) {
        return mapper.findTopKSimilarBySpecId(specId, limit)
                .stream().map(this::toEntity).collect(Collectors.toList());
    }

    @Override
    public List<Long> findActiveSpecIdsWithEmbedding() {
        return mapper.findActiveSpecIdsWithEmbedding();
    }

    @Override
    public int countActiveSpecs() {
        return mapper.countActiveSpecs();
    }

    @Override
    public List<Steering> findAllActiveWithEmbedding() {
        return mapper.findAllActiveWithEmbedding()
                .stream().map(this::toEntity).collect(Collectors.toList());
    }

    @Override
    public boolean compareAndSetStatus(Long id, SteeringStatus expected, SteeringStatus target) {
        return mapper.compareAndSetStatus(id, expected.getCode(), target.getCode()) > 0;
    }

    @Override
    public int commitActivate(Long id, String title, String content, String tags, String keywords,
                              Integer currentVersion, String embeddingStr, String contentEmbeddingStr) {
        return mapper.commitActivate(id, title, content, tags, keywords, currentVersion, embeddingStr, contentEmbeddingStr);
    }

    private String toVectorString(float[] embedding) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < embedding.length; i++) {
            if (i > 0) sb.append(",");
            sb.append(embedding[i]);
        }
        return sb.append("]").toString();
    }

    private Steering toEntity(SteeringPO po) {
        Steering entity = new Steering();
        BeanUtils.copyProperties(po, entity);
        return entity;
    }

    private SteeringPO toPO(Steering entity) {
        SteeringPO po = new SteeringPO();
        BeanUtils.copyProperties(entity, po);
        return po;
    }
}
