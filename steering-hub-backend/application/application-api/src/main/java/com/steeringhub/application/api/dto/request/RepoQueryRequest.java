package com.steeringhub.application.api.dto.request;

import lombok.Data;

@Data
public class RepoQueryRequest {

    private String name;

    private String team;

    private Boolean enabled;

    private int page = 1;

    private int size = 20;
}
