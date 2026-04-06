package com.steeringhub.domain.impl.service;

import com.steeringhub.domain.model.health.SimilarSpecPair;
import com.steeringhub.domain.model.steering.Steering;
import com.steeringhub.domain.service.HealthCheckDomainService;
import com.steeringhub.embedding.EmbeddingService;
import com.steeringhub.repository.SteeringRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class HealthCheckDomainServiceImpl implements HealthCheckDomainService {

    private final SteeringRepository steeringRepository;
    private final EmbeddingService embeddingService;

    @Override
    public List<SimilarSpecPair> detectSimilarPairs(Long taskId, double similarityThreshold) {
        // Ensure all active specs have content_embedding
        List<Steering> activeSpecs = steeringRepository.findAllActiveWithEmbedding();
        Set<Long> withEmbedding = new HashSet<>(steeringRepository.findActiveSpecIdsWithEmbedding());

        for (Steering spec : activeSpecs) {
            if (!withEmbedding.contains(spec.getId())) {
                try {
                    String plainText = stripMarkdown(spec.getContent());
                    float[] vec = embeddingService.embed(plainText);
                    steeringRepository.updateContentEmbedding(spec.getId(), toVecStr(vec));
                } catch (Exception e) {
                    log.warn("Failed to generate content_embedding for spec {}: {}", spec.getId(), e.getMessage());
                }
            }
        }

        // Pairwise similarity comparison
        Set<String> seenPairs = new HashSet<>();
        List<SimilarSpecPair> pairs = new ArrayList<>();
        List<Long> specsWithEmbedding = steeringRepository.findActiveSpecIdsWithEmbedding();

        for (Long specId : specsWithEmbedding) {
            List<Steering> similar = steeringRepository.findTopKSimilarBySpecId(specId, 10);
            for (Steering candidate : similar) {
                double score = candidate.getSimilarityScore() != null ? candidate.getSimilarityScore() : 0.0;
                if (score < similarityThreshold) continue;

                long aId = Math.min(specId, candidate.getId());
                long bId = Math.max(specId, candidate.getId());
                String key = aId + "-" + bId;
                if (!seenPairs.add(key)) continue;

                SimilarSpecPair pair = new SimilarSpecPair();
                pair.setTaskId(taskId);
                pair.setSpecAId(aId);
                pair.setSpecBId(bId);
                pair.setOverallScore(BigDecimal.valueOf(score).setScale(3, RoundingMode.HALF_UP));
                pair.setVectorScore(BigDecimal.valueOf(score).setScale(3, RoundingMode.HALF_UP));
                pair.setReasonTags("[\"内容语义相近\"]");
                pairs.add(pair);
            }
        }
        return pairs;
    }

    private String stripMarkdown(String content) {
        if (content == null) return "";
        return content
                .replaceAll("```[\\s\\S]*?```", " ")
                .replaceAll("`[^`]*`", " ")
                .replaceAll("#{1,6}\\s+", " ")
                .replaceAll("\\*{1,3}([^*]+)\\*{1,3}", "$1")
                .replaceAll("_{1,3}([^_]+)_{1,3}", "$1")
                .replaceAll("!?\\[[^\\]]*\\]\\([^)]*\\)", " ")
                .replaceAll("[>\\-*+]\\s+", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private String toVecStr(float[] vec) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < vec.length; i++) {
            if (i > 0) sb.append(",");
            sb.append(vec[i]);
        }
        sb.append("]");
        return sb.toString();
    }
}
