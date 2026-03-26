package com.steeringhub.steering.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;

@Data
@TableName("category_hierarchy")
public class CategoryHierarchy implements Serializable {

    private Long parentCategoryId;

    private Long childCategoryId;

    private Integer sortOrder;
}
