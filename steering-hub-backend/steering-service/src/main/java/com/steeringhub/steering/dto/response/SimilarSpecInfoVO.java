package com.steeringhub.steering.dto.response;

import lombok.Data;

@Data
public class SimilarSpecInfoVO {

    private Long id;

    private String title;

    private String tags;

    private String status;

    private Long categoryId;

    private String categoryName;
}
