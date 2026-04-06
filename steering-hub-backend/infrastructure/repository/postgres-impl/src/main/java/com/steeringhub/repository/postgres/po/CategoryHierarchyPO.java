package com.steeringhub.repository.postgres.po;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

@Data
@TableName("category_hierarchy")
public class CategoryHierarchyPO {

    private Long parentCategoryId;

    private Long childCategoryId;

    private Integer sortOrder;
}
