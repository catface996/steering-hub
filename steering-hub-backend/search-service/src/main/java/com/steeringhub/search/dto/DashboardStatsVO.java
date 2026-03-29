package com.steeringhub.search.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class DashboardStatsVO {

    /** 最近 7 天检索次数 */
    private int weeklySearchCount;

    /** 已生效规范数量 */
    private int activeSteeringCount;
}
