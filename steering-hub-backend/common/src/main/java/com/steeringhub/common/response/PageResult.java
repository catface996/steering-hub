package com.steeringhub.common.response;

import com.baomidou.mybatisplus.core.metadata.IPage;
import lombok.Data;

import java.io.Serializable;
import java.util.List;

@Data
public class PageResult<T> implements Serializable {

    private Long total;
    private Long pages;
    private Long current;
    private Long size;
    private List<T> records;

    public static <T> PageResult<T> of(IPage<T> page) {
        PageResult<T> result = new PageResult<>();
        result.total = page.getTotal();
        result.pages = page.getPages();
        result.current = page.getCurrent();
        result.size = page.getSize();
        result.records = page.getRecords();
        return result;
    }

    public static <T> PageResult<T> of(List<T> records, long total, long current, long size) {
        PageResult<T> result = new PageResult<>();
        result.total = total;
        result.pages = (long) Math.ceil((double) total / size);
        result.current = current;
        result.size = size;
        result.records = records;
        return result;
    }
}
