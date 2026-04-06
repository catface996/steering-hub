package com.steeringhub.application.impl;

import com.steeringhub.application.api.dto.request.SearchRequest;
import com.steeringhub.application.api.dto.response.*;
import com.steeringhub.application.api.service.SearchApplicationService;
import com.steeringhub.common.response.PageResult;
import com.steeringhub.domain.model.search.SteeringQueryLog;
import com.steeringhub.domain.model.steering.Steering;
import com.steeringhub.domain.model.steering.SteeringStatus;
import com.steeringhub.embedding.EmbeddingService;
import com.steeringhub.repository.SteeringQueryLogRepository;
import com.steeringhub.repository.SteeringRepository;
import com.steeringhub.repository.SteeringUsageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SearchApplicationServiceImpl implements SearchApplicationService {

    private final SteeringRepository steeringRepository;
    private final EmbeddingService embeddingService;
    private final SteeringUsageRepository steeringUsageRepository;
    private final SteeringQueryLogRepository steeringQueryLogRepository;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public SearchResponse search(SearchRequest request) {
        log.info("search start query={} mode={}", request.getQuery(), request.getMode());

        int limit = request.getLimit() != null ? request.getLimit() : 10;
        Long categoryId = request.getCategoryId();
        String mode = request.getMode() != null ? request.getMode() : "hybrid";

        List<SearchResult> results;
        if ("semantic".equals(mode)) {
            results = doSemanticSearch(request.getQuery(), categoryId, limit);
        } else if ("fulltext".equals(mode)) {
            results = doFullTextSearch(request.getQuery(), categoryId, limit);
        } else {
            results = doHybridSearch(request.getQuery(), categoryId, limit);
        }

        // Log the query
        SteeringQueryLog queryLog = new SteeringQueryLog();
        queryLog.setQueryText(request.getQuery());
        queryLog.setSearchMode(mode);
        queryLog.setResultCount(results.size());
        if (!results.isEmpty()) {
            queryLog.setResultSteeringIds(
                    results.stream().map(r -> String.valueOf(r.getSteeringId()))
                            .collect(Collectors.joining(",", "[", "]")));
        }
        queryLog.setSource("application");
        queryLog.setRepo(request.getRepo());
        queryLog.setModelName(request.getModelName());
        queryLog.setAgentName(request.getAgentName());
        steeringQueryLogRepository.save(queryLog);

        SearchResponse response = new SearchResponse();
        response.setLogId(queryLog.getId());
        response.setResults(results);

        log.info("search done query={} resultCount={}", request.getQuery(), results.size());
        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public SteeringQualityReport analyzeSteeringQuality(Long steeringId) {
        log.info("analyzeSteeringQuality steeringId={}", steeringId);

        Steering steering = steeringRepository.getById(steeringId);
        if (steering == null) {
            throw new IllegalArgumentException("Steering not found: " + steeringId);
        }

        SteeringQualityReport report = new SteeringQualityReport();
        report.setSteeringId(steeringId);
        report.setTitle(steering.getTitle());

        SteeringQualityReport.QualityScores scores = new SteeringQualityReport.QualityScores();
        int tagCount = StringUtils.hasText(steering.getTags()) ? steering.getTags().split(",").length : 0;
        int keywordCount = StringUtils.hasText(steering.getKeywords()) ? steering.getKeywords().split(",").length : 0;
        scores.setTagCount(tagCount);
        scores.setKeywordCount(keywordCount);

        // Self-retrieval test using title
        List<SearchResult> titleResults = doHybridSearch(steering.getTitle(), null, 10);
        int rank = 0;
        for (int i = 0; i < titleResults.size(); i++) {
            if (titleResults.get(i).getSteeringId().equals(steeringId)) {
                rank = i + 1;
                break;
            }
        }
        scores.setSelfRetrievalRank(rank > 0 ? rank : null);
        scores.setSelfRetrievalScore(rank > 0 ? (1.0 / rank) : 0.0);

        double baseScore = rank == 1 ? 0.5 : (rank <= 3 ? 0.3 : 0.1);
        scores.setOverallScore(baseScore + Math.min(tagCount, 5) / 5.0 * 0.15 + Math.min(keywordCount, 5) / 5.0 * 0.15);

        List<String> suggestions = new ArrayList<>();
        if (tagCount < 3) suggestions.add("建议添加更多标签（当前:" + tagCount + "，建议≥3）");
        if (keywordCount < 3) suggestions.add("建议添加更多关键词（当前:" + keywordCount + "，建议≥3）");
        report.setScores(scores);
        report.setSuggestions(suggestions);
        return report;
    }

    @Override
    @Transactional(readOnly = true)
    public List<SteeringQualityReport> analyzeBatchQuality(int limit) {
        log.info("analyzeBatchQuality limit={}", limit);
        // Use a broad page query to get all active steerings
        com.steeringhub.repository.query.SteeringQuery query = new com.steeringhub.repository.query.SteeringQuery();
        query.setStatus(SteeringStatus.ACTIVE);
        PageResult<Steering> all = steeringRepository.page(query, 1, 1000);

        return all.getRecords().stream()
                .map(s -> {
                    try { return analyzeSteeringQuality(s.getId()); }
                    catch (Exception e) { return null; }
                })
                .filter(Objects::nonNull)
                .sorted(Comparator.comparingDouble(r -> r.getScores().getOverallScore()))
                .limit(limit)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public DashboardStatsVO getDashboardStats() {
        int weeklySearchCount = steeringQueryLogRepository.countWeeklySearches();
        int activeCount = steeringRepository.countActiveSpecs();
        return new DashboardStatsVO(weeklySearchCount, activeCount);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> queryAnalytics(int days) {
        log.info("queryAnalytics days={}", days);
        // Delegate to dashboard stats as a simplified analytics view
        Map<String, Object> analytics = new HashMap<>();
        analytics.put("weeklySearchCount", steeringQueryLogRepository.countWeeklySearches());
        analytics.put("activeSteeringCount", steeringRepository.countActiveSpecs());
        analytics.put("days", days);
        return analytics;
    }

    @Override
    @Transactional(readOnly = true)
    public PageResult<QueryLogVO> getQueryLogs(String query, String startDate, String endDate, int page, int size) {
        log.info("getQueryLogs query={} page={} size={}", query, page, size);
        PageResult<SteeringQueryLog> result = steeringQueryLogRepository.page(query, startDate, endDate, page, size);
        List<QueryLogVO> voList = result.getRecords().stream()
                .map(this::toQueryLogVO)
                .collect(Collectors.toList());
        return PageResult.of(voList, result.getTotal(), page, size);
    }

    @Override
    @Transactional(readOnly = true)
    public List<QueryLogVO> getFailureLogs(int days, int limit) {
        log.info("getFailureLogs days={} limit={}", days, limit);
        return steeringQueryLogRepository.findFailureLogs(days, limit).stream()
                .map(this::toQueryLogVO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public QueryLogDetailVO getQueryLogById(Long id) {
        log.info("getQueryLogById id={}", id);
        SteeringQueryLog logEntry = steeringQueryLogRepository.getById(id);
        if (logEntry == null) return null;

        QueryLogDetailVO vo = new QueryLogDetailVO();
        vo.setId(logEntry.getId());
        vo.setQueryText(logEntry.getQueryText());
        vo.setSearchMode(logEntry.getSearchMode());
        vo.setResultCount(logEntry.getResultCount());
        vo.setResultSteeringIds(logEntry.getResultSteeringIds());
        vo.setSource(logEntry.getSource());
        vo.setRepo(logEntry.getRepo());
        vo.setTaskDescription(logEntry.getTaskDescription());
        vo.setResponseTimeMs(logEntry.getResponseTimeMs());
        vo.setIsEffective(logEntry.getIsEffective());
        vo.setFailureReason(logEntry.getFailureReason());
        vo.setExpectedTopic(logEntry.getExpectedTopic());
        vo.setModelName(logEntry.getModelName());
        vo.setAgentName(logEntry.getAgentName());
        vo.setCreatedAt(logEntry.getCreatedAt());

        // Resolve hit steerings
        List<HitSteeringVO> hitSteerings = new ArrayList<>();
        String idsStr = logEntry.getResultSteeringIds();
        if (StringUtils.hasText(idsStr)) {
            try {
                String cleaned = idsStr.replaceAll("[\\[\\]\\s]", "");
                if (!cleaned.isEmpty()) {
                    for (String idStr : cleaned.split(",")) {
                        Long sid = Long.parseLong(idStr.trim());
                        Steering s = steeringRepository.getById(sid);
                        if (s != null) {
                            HitSteeringVO h = new HitSteeringVO();
                            h.setId(s.getId());
                            h.setTitle(s.getTitle());
                            String c = s.getContent();
                            h.setContentSummary(c != null && c.length() > 200 ? c.substring(0, 200) + "…" : c);
                            h.setStatus(s.getStatus() != null ? s.getStatus().name() : null);
                            h.setCurrentVersion(s.getCurrentVersion());
                            h.setTags(s.getTags());
                            hitSteerings.add(h);
                        }
                    }
                }
            } catch (Exception ignored) {
            }
        }
        vo.setHitSteerings(hitSteerings);
        return vo;
    }

    // --- new methods for Controller migration ---

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void submitFeedback(Long queryId, String result, String reason, String expectedTopic) {
        log.info("submitFeedback queryId={} result={}", queryId, result);
        SteeringQueryLog logEntry = steeringQueryLogRepository.getById(queryId);
        if (logEntry == null) return;

        if ("success".equals(result)) {
            logEntry.setIsEffective(true);
        } else if ("failure".equals(result)) {
            logEntry.setIsEffective(false);
            logEntry.setFailureReason(reason);
            logEntry.setExpectedTopic(expectedTopic);
        }
        steeringQueryLogRepository.update(logEntry);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void triggerEmbeddingUpdate(Long steeringId) {
        log.info("triggerEmbeddingUpdate steeringId={}", steeringId);
        Steering steering = steeringRepository.getById(steeringId);
        if (steering == null) return;

        float[] embedding = embeddingService.embed(steering.getTitle() + " " + steering.getKeywords());
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < embedding.length; i++) {
            if (i > 0) sb.append(",");
            sb.append(embedding[i]);
        }
        sb.append("]");
        steeringRepository.updateEmbedding(steeringId, sb.toString());
    }

    // --- private helpers ---

    private List<SearchResult> doHybridSearch(String query, Long categoryId, int limit) {
        List<SearchResult> semantic = doSemanticSearch(query, categoryId, limit);
        List<SearchResult> fulltext = doFullTextSearch(query, categoryId, limit);

        Map<Long, SearchResult> merged = new LinkedHashMap<>();
        for (SearchResult r : semantic) {
            r.setMatchType("semantic");
            merged.put(r.getSteeringId(), r);
        }
        for (SearchResult r : fulltext) {
            if (merged.containsKey(r.getSteeringId())) {
                SearchResult existing = merged.get(r.getSteeringId());
                existing.setScore(Math.min(1.0, existing.getScore() + r.getScore() * 0.5));
                existing.setMatchType("hybrid");
                existing.setMatchLevel(existing.getScore() >= 0.7 ? "high" : existing.getScore() >= 0.5 ? "good" : "fair");
            } else {
                r.setMatchType("fulltext");
                merged.put(r.getSteeringId(), r);
            }
        }

        return merged.values().stream()
                .sorted(Comparator.comparingDouble(SearchResult::getScore).reversed())
                .limit(limit)
                .collect(Collectors.toList());
    }

    private List<SearchResult> doSemanticSearch(String query, Long categoryId, int limit) {
        float[] embedding = embeddingService.embed(query);
        List<Steering> steerings = steeringRepository.vectorSearch(embedding, limit, categoryId);
        return steerings.stream()
                .map(s -> toSearchResult(s, s.getSimilarityScore() != null ? Math.min(1.0, Math.max(0.0, s.getSimilarityScore())) : 0.5, "semantic"))
                .collect(Collectors.toList());
    }

    private List<SearchResult> doFullTextSearch(String query, Long categoryId, int limit) {
        List<Steering> steerings = steeringRepository.fullTextSearch(query, categoryId, limit);
        List<SearchResult> results = new ArrayList<>();
        for (int i = 0; i < steerings.size(); i++) {
            results.add(toSearchResult(steerings.get(i), Math.max(0.4, 0.9 - i * 0.05), "fulltext"));
        }
        return results;
    }

    private SearchResult toSearchResult(Steering steering, double score, String matchType) {
        SearchResult r = new SearchResult();
        r.setSteeringId(steering.getId());
        r.setTitle(steering.getTitle());
        r.setContent(steering.getContent());
        r.setCategoryId(steering.getCategoryId());
        r.setStatus(steering.getStatus());
        r.setCurrentVersion(steering.getCurrentVersion());
        r.setKeywords(steering.getKeywords());
        r.setUpdatedAt(steering.getUpdatedAt());
        r.setScore(score);
        r.setMatchType(matchType);
        r.setMatchLevel(score >= 0.7 ? "high" : score >= 0.5 ? "good" : "fair");
        if (StringUtils.hasText(steering.getTags())) {
            r.setTags(Arrays.asList(steering.getTags().split(",")));
        }
        return r;
    }

    private QueryLogVO toQueryLogVO(SteeringQueryLog log) {
        QueryLogVO vo = new QueryLogVO();
        vo.setId(log.getId());
        vo.setQueryText(log.getQueryText());
        vo.setSearchMode(log.getSearchMode());
        vo.setResultCount(log.getResultCount());
        vo.setResultSteeringIds(log.getResultSteeringIds());
        vo.setSource(log.getSource());
        vo.setRepo(log.getRepo());
        vo.setTaskDescription(log.getTaskDescription());
        vo.setResponseTimeMs(log.getResponseTimeMs());
        vo.setIsEffective(log.getIsEffective());
        vo.setFailureReason(log.getFailureReason());
        vo.setExpectedTopic(log.getExpectedTopic());
        vo.setModelName(log.getModelName());
        vo.setAgentName(log.getAgentName());
        vo.setCreatedAt(log.getCreatedAt());
        return vo;
    }
}
