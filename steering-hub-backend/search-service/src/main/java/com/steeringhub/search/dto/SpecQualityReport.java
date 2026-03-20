package com.steeringhub.search.dto;

import lombok.Data;

import java.util.List;

@Data
public class SpecQualityReport {

    private Long specId;
    private String title;
    private QualityScores scores;
    private List<String> suggestions;

    @Data
    public static class QualityScores {
        /** 用 title 搜索，自身排第几（1=最好） */
        private Integer selfRetrievalRank;

        /** 自身在搜索结果中的分数 */
        private Double selfRetrievalScore;

        /** tags 数量 */
        private Integer tagCount;

        /** keywords 数量 */
        private Integer keywordCount;

        /** 综合评分 0-1 */
        private Double overallScore;
    }
}
