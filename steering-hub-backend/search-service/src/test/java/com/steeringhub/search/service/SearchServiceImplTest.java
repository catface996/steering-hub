package com.steeringhub.search.service;

import com.steeringhub.domain.model.steering.SteeringStatus;
import com.steeringhub.search.dto.SearchRequest;
import com.steeringhub.search.dto.SearchResult;
import com.steeringhub.search.service.impl.SearchServiceImpl;
import com.steeringhub.steering.entity.Steering;
import com.steeringhub.steering.mapper.SteeringCategoryMapper;
import com.steeringhub.steering.mapper.SteeringMapper;
import com.steeringhub.steering.mapper.StopWordMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

/**
 * SearchServiceImpl 单元测试
 *
 * 活跃规范（status=active）过滤保证：
 * - SQL 层通过 WHERE status='active' 保证 mapper 只返回 active 规范
 * - 服务层对 mapper 结果直接透传，不做二次过滤
 * 这里验证：当 mapper 按照规范只返回 active 数据时，服务层结果同样全部为 active。
 */
@ExtendWith(MockitoExtension.class)
class SearchServiceImplTest {

    @Mock private SteeringMapper steeringMapper;
    @Mock private SteeringCategoryMapper steeringCategoryMapper;
    @Mock private EmbeddingService embeddingService;
    @Mock private StopWordMapper stopWordMapper;

    @InjectMocks
    private SearchServiceImpl searchService;

    // =========================================================================
    // semanticSearch / fullTextSearch 只返回 active 规范
    // =========================================================================

    @Test
    void semanticSearch_onlyReturnsActiveSpecs() {
        // Arrange
        float[] mockEmbedding = {0.1f, 0.2f, 0.3f};
        Steering active1 = buildActiveSteering(1L, "API 设计规范");
        Steering active2 = buildActiveSteering(2L, "数据库设计规范");

        when(stopWordMapper.selectList(any())).thenReturn(Collections.emptyList());
        when(embeddingService.embed(anyString())).thenReturn(mockEmbedding);
        when(steeringMapper.vectorSearch(anyString(), anyInt(), isNull()))
                .thenReturn(List.of(active1, active2));

        // Act
        List<SearchResult> results = searchService.semanticSearch("API 设计", null, 10);

        // Assert
        assertThat(results)
                .as("语义搜索结果不应为空")
                .isNotEmpty();
        assertThat(results)
                .as("语义搜索结果应全部为 active 状态（SQL 过滤保证）")
                .allSatisfy(r ->
                        assertThat(r.getStatus())
                                .isEqualTo(SteeringStatus.ACTIVE));
    }

    @Test
    void fullTextSearch_onlyReturnsActiveSpecs() {
        // Arrange
        Steering active1 = buildActiveSteering(3L, "单元测试规范");

        when(stopWordMapper.selectList(any())).thenReturn(Collections.emptyList());
        when(steeringMapper.fullTextSearch(anyString(), isNull(), anyInt()))
                .thenReturn(List.of(active1));

        // Act
        List<SearchResult> results = searchService.fullTextSearch("单元测试", null, 10);

        // Assert
        assertThat(results)
                .as("全文搜索结果不应为空")
                .isNotEmpty();
        assertThat(results)
                .as("全文搜索结果应全部为 active 状态（SQL 过滤保证）")
                .allSatisfy(r ->
                        assertThat(r.getStatus())
                                .isEqualTo(SteeringStatus.ACTIVE));
    }

    @Test
    void hybridSearch_excludesNonActiveResults() {
        // Arrange：语义+全文各返回一条 active 规范，模拟 SQL 已过滤
        float[] mockEmbedding = {0.5f, 0.6f};
        Steering semanticHit = buildActiveSteering(10L, "代码审查规范");
        Steering fulltextHit = buildActiveSteering(11L, "接口设计规范");

        when(stopWordMapper.selectList(any())).thenReturn(Collections.emptyList());
        when(embeddingService.embed(anyString())).thenReturn(mockEmbedding);
        when(steeringMapper.vectorSearch(anyString(), anyInt(), isNull()))
                .thenReturn(List.of(semanticHit));
        when(steeringMapper.fullTextSearch(anyString(), isNull(), anyInt()))
                .thenReturn(List.of(fulltextHit));

        SearchRequest request = new SearchRequest();
        request.setQuery("代码规范");
        request.setLimit(10);

        // Act
        List<SearchResult> results = searchService.hybridSearch(request);

        // Assert：混合搜索合并后所有结果仍为 active
        assertThat(results)
                .as("混合搜索应返回两条结果（无重叠 ID）")
                .hasSize(2);
        assertThat(results)
                .as("混合搜索结果应全部为 active 状态")
                .allSatisfy(r ->
                        assertThat(r.getStatus())
                                .isEqualTo(SteeringStatus.ACTIVE));
    }

    @Test
    void hybridSearch_boostScoreForOverlappingResults() {
        // Arrange：同一规范同时命中语义和全文检索，分数应被提升，matchType 变为 hybrid
        float[] mockEmbedding = {0.5f, 0.6f};
        Steering overlapping = buildActiveSteering(20L, "重叠命中规范");
        overlapping.setSimilarityScore(0.75);

        when(stopWordMapper.selectList(any())).thenReturn(Collections.emptyList());
        when(embeddingService.embed(anyString())).thenReturn(mockEmbedding);
        when(steeringMapper.vectorSearch(anyString(), anyInt(), isNull()))
                .thenReturn(List.of(overlapping));
        when(steeringMapper.fullTextSearch(anyString(), isNull(), anyInt()))
                .thenReturn(List.of(overlapping));

        SearchRequest request = new SearchRequest();
        request.setQuery("重叠");
        request.setLimit(10);

        // Act
        List<SearchResult> results = searchService.hybridSearch(request);

        // Assert：去重后只有一条，matchType = hybrid，score > 原始语义分
        assertThat(results).hasSize(1);
        SearchResult result = results.get(0);
        assertThat(result.getMatchType())
                .as("同时命中语义+全文的结果 matchType 应为 hybrid")
                .isEqualTo("hybrid");
        assertThat(result.getScore())
                .as("hybrid 结果分数应高于纯语义分数 0.75")
                .isGreaterThan(0.75);
    }

    // =========================================================================
    // 辅助方法
    // =========================================================================

    private Steering buildActiveSteering(Long id, String title) {
        Steering s = new Steering();
        s.setId(id);
        s.setTitle(title);
        s.setContent("内容：" + title);
        s.setStatus(SteeringStatus.ACTIVE);
        s.setCurrentVersion(1);
        s.setDeleted(false);
        return s;
    }
}
