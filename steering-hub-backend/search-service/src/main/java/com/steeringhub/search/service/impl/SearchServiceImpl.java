package com.steeringhub.search.service.impl;

import com.steeringhub.search.dto.SearchRequest;
import com.steeringhub.search.dto.SearchResult;
import com.steeringhub.search.dto.SpecQualityReport;
import com.steeringhub.search.service.EmbeddingService;
import com.steeringhub.search.service.SearchService;
import com.steeringhub.spec.entity.Spec;
import com.steeringhub.spec.entity.SpecCategory;
import com.steeringhub.spec.mapper.SpecCategoryMapper;
import com.steeringhub.spec.mapper.SpecMapper;
import com.steeringhub.spec.service.SpecService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SearchServiceImpl implements SearchService {

    private final SpecMapper specMapper;
    private final SpecCategoryMapper specCategoryMapper;
    private final SpecService specService;
    private final EmbeddingService embeddingService;

    @Override
    public List<SearchResult> hybridSearch(SearchRequest request) {
        List<SearchResult> semanticResults = semanticSearch(request.getQuery(), request.getCategoryId(), request.getLimit());
        List<SearchResult> fulltextResults = fullTextSearch(request.getQuery(), request.getCategoryId(), request.getLimit());

        // Merge and deduplicate by specId, keeping highest score
        Map<Long, SearchResult> merged = new LinkedHashMap<>();

        for (SearchResult r : semanticResults) {
            r.setMatchType("semantic");
            merged.put(r.getSpecId(), r);
        }

        for (SearchResult r : fulltextResults) {
            if (merged.containsKey(r.getSpecId())) {
                // Boost score for results found in both
                SearchResult existing = merged.get(r.getSpecId());
                existing.setScore(Math.min(1.0, existing.getScore() + r.getScore() * 0.5));
                existing.setMatchType("hybrid");
            } else {
                r.setMatchType("fulltext");
                merged.put(r.getSpecId(), r);
            }
        }

        // Sort: hybrid > fulltext > semantic (by matchType priority, then by score)
        return merged.values().stream()
                .sorted(Comparator
                        .comparing((SearchResult sr) -> {
                            if ("hybrid".equals(sr.getMatchType())) return 0;
                            if ("fulltext".equals(sr.getMatchType())) return 1;
                            return 2; // semantic
                        })
                        .thenComparing(Comparator.comparingDouble(SearchResult::getScore).reversed())
                )
                .limit(request.getLimit())
                .collect(Collectors.toList());
    }

    @Override
    public List<SearchResult> semanticSearch(String query, Long categoryId, int limit) {
        float[] queryEmbedding = embeddingService.embed(query);
        String embeddingStr = toEmbeddingString(queryEmbedding);

        List<Spec> specs = specMapper.vectorSearch(embeddingStr, limit, categoryId);
        return specs.stream()
                .map(spec -> {
                    double score = spec.getSimilarityScore() != null ? spec.getSimilarityScore() : 0.5;
                    return toSearchResult(spec, Math.min(1.0, Math.max(0.0, score)), "semantic");
                })
                .collect(Collectors.toList());
    }

    @Override
    public List<SearchResult> fullTextSearch(String query, Long categoryId, int limit) {
        List<Spec> specs = specMapper.fullTextSearch(query, categoryId, limit);
        List<SearchResult> results = new ArrayList<>();
        for (int i = 0; i < specs.size(); i++) {
            double score = Math.max(0.4, 0.9 - i * 0.05);
            results.add(toSearchResult(specs.get(i), score, "fulltext"));
        }
        return results;
    }

    @Override
    @Async
    public void triggerEmbeddingUpdate(Long specId) {
        try {
            Spec spec = specService.getById(specId);
            if (spec == null) return;
            float[] embedding = embeddingService.embedSpec(spec.getTitle(), spec.getKeywords(), spec.getTags());
            specService.updateEmbedding(specId, embedding);
            log.info("Embedding updated for spec: {}", specId);
        } catch (Exception e) {
            log.error("Failed to update embedding for spec: {}", specId, e);
        }
    }

    private SearchResult toSearchResult(Spec spec, double score, String matchType) {
        SearchResult result = new SearchResult();
        result.setSpecId(spec.getId());
        result.setTitle(spec.getTitle());
        result.setContent(spec.getContent());
        result.setCategoryId(spec.getCategoryId());
        if (spec.getCategoryId() != null) {
            SpecCategory category = specCategoryMapper.selectById(spec.getCategoryId());
            if (category != null) {
                result.setCategoryName(category.getName());
            }
        }
        result.setStatus(spec.getStatus());
        result.setCurrentVersion(spec.getCurrentVersion());
        result.setKeywords(spec.getKeywords());
        result.setUpdatedAt(spec.getUpdatedAt());
        result.setScore(score);
        result.setMatchType(matchType);
        if (StringUtils.hasText(spec.getTags())) {
            result.setTags(Arrays.asList(spec.getTags().split(",")));
        }
        return result;
    }

    private String toEmbeddingString(float[] embedding) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < embedding.length; i++) {
            if (i > 0) sb.append(",");
            sb.append(embedding[i]);
        }
        sb.append("]");
        return sb.toString();
    }

    @Override
    public SpecQualityReport analyzeSpecQuality(Long specId) {
        Spec spec = specService.getById(specId);
        if (spec == null) {
            throw new IllegalArgumentException("Spec not found: " + specId);
        }

        // 用 title 进行混合检索
        SearchRequest request = new SearchRequest();
        request.setQuery(spec.getTitle());
        request.setLimit(10);
        List<SearchResult> searchResults = hybridSearch(request);

        // 找到自己的排名和分数
        int selfRank = 0;
        double selfScore = 0.0;
        for (int i = 0; i < searchResults.size(); i++) {
            if (searchResults.get(i).getSpecId().equals(specId)) {
                selfRank = i + 1;
                selfScore = searchResults.get(i).getScore();
                break;
            }
        }

        // 计算 tag 和 keyword 数量
        int tagCount = 0;
        if (StringUtils.hasText(spec.getTags())) {
            tagCount = spec.getTags().split(",").length;
        }

        int keywordCount = 0;
        if (StringUtils.hasText(spec.getKeywords())) {
            keywordCount = spec.getKeywords().split(",").length;
        }

        // 计算综合评分
        double overallScore = calculateOverallScore(selfRank, selfScore, tagCount, keywordCount);

        // 构建报告
        SpecQualityReport report = new SpecQualityReport();
        report.setSpecId(specId);
        report.setTitle(spec.getTitle());

        SpecQualityReport.QualityScores scores = new SpecQualityReport.QualityScores();
        scores.setSelfRetrievalRank(selfRank > 0 ? selfRank : null);
        scores.setSelfRetrievalScore(selfScore);
        scores.setTagCount(tagCount);
        scores.setKeywordCount(keywordCount);
        scores.setOverallScore(overallScore);
        report.setScores(scores);

        // 生成建议
        List<String> suggestions = new ArrayList<>();
        if (selfRank > 3 || selfRank == 0) {
            suggestions.add("标题可能不够清晰或独特，建议优化标题以提高可检索性");
        }
        if (tagCount < 3) {
            suggestions.add("建议添加更多标签（当前: " + tagCount + "，建议至少 3 个）");
        }
        if (keywordCount < 3) {
            suggestions.add("建议添加更多关键词（当前: " + keywordCount + "，建议至少 3 个）");
        }
        report.setSuggestions(suggestions);

        return report;
    }

    @Override
    public List<SpecQualityReport> analyzeBatchQuality(int limit) {
        // 获取所有 active 状态的规范
        List<Spec> allSpecs = specMapper.selectList(null);

        return allSpecs.stream()
                .map(spec -> {
                    try {
                        return analyzeSpecQuality(spec.getId());
                    } catch (Exception e) {
                        log.error("Failed to analyze quality for spec: {}", spec.getId(), e);
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .sorted(Comparator.comparingDouble(r -> r.getScores().getOverallScore()))
                .limit(limit)
                .collect(Collectors.toList());
    }

    private double calculateOverallScore(int selfRank, double selfScore, int tagCount, int keywordCount) {
        double rankScore;
        if (selfRank == 1) {
            rankScore = 0.5;
        } else if (selfRank <= 3 && selfRank > 0) {
            rankScore = 0.3;
        } else {
            rankScore = 0.1;
        }

        double retrievalScore = selfScore * 0.3;
        double tagScore = Math.min(tagCount, 5) / 5.0 * 0.1;
        double keywordScore = Math.min(keywordCount, 5) / 5.0 * 0.1;

        return rankScore + retrievalScore + tagScore + keywordScore;
    }
}
