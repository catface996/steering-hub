package com.steeringhub.application.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RepoUpdateRequest {

    @NotBlank
    @Size(max = 200)
    private String name;

    @Size(max = 1000)
    private String description;

    @Size(max = 500)
    private String url;

    @Size(max = 100)
    private String language;

    @Size(max = 200)
    private String team;
}
