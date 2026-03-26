package com.steeringhub.steering.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class CategoryChildCountVO {

    private Long categoryId;

    private int childCount;
}
