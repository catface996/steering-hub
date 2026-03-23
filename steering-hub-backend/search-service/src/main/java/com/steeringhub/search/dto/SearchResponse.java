package com.steeringhub.search.dto;

import lombok.Data;

import java.util.List;

@Data
public class SearchResponse {
    private Long logId;
    private List<SearchResult> results;
}
