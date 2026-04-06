package com.steeringhub.application.api.dto.response;

import lombok.Data;

import java.util.List;

@Data
public class SteeringQualityReport {

    private Long steeringId;
    private String title;
    private QualityScores scores;
    private List<String> suggestions;

    @Data
    public static class QualityScores {
        private Integer selfRetrievalRank;
        private Double selfRetrievalScore;
        private Integer tagCount;
        private Integer keywordCount;
        private Double overallScore;
    }
}
