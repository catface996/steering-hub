package com.steeringhub.search.service;

import com.steeringhub.search.dto.SearchRequest;
import com.steeringhub.search.dto.SearchResult;
import com.steeringhub.search.dto.SteeringQualityReport;

import java.util.List;

public interface SearchService {

    /**
     * 混合检索：语义 + 全文，结果合并去重后按综合得分排序
     */
    List<SearchResult> hybridSearch(SearchRequest request);

    /**
     * 纯语义检索（pgvector cosine similarity）
     */
    List<SearchResult> semanticSearch(String query, Long categoryId, int limit);

    /**
     * 纯全文检索（PostgreSQL tsvector）
     */
    List<SearchResult> fullTextSearch(String query, Long categoryId, int limit);

    /**
     * 规范保存/更新后触发异步 embedding 生成
     */
    void triggerEmbeddingUpdate(Long steeringId);

    /**
     * 分析规范的可检索性质量
     */
    SteeringQualityReport analyzeSteeringQuality(Long steeringId);

    /**
     * 批量分析规范质量，返回质量最差的 N 条规范
     */
    List<SteeringQualityReport> analyzeBatchQuality(int limit);
}
