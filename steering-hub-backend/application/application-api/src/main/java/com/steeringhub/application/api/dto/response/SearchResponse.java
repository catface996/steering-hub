package com.steeringhub.application.api.dto.response;

import lombok.Data;

import java.util.List;

@Data
public class SearchResponse {
    private Long logId;
    private List<SearchResult> results;
}
