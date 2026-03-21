package com.steeringhub.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.steeringhub.common.response.Result;
import com.steeringhub.steering.entity.StopWord;
import com.steeringhub.steering.mapper.StopWordMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 停用词管理控制器
 */
@RestController
@RequestMapping("/api/v1/web/stop-words")
@RequiredArgsConstructor
public class StopWordController {

    private final StopWordMapper stopWordMapper;

    /**
     * 获取停用词列表
     */
    @GetMapping
    public Result<List<StopWord>> list() {
        List<StopWord> list = stopWordMapper.selectList(
            new LambdaQueryWrapper<StopWord>().orderByAsc(StopWord::getWord)
        );
        return Result.ok(list);
    }

    /**
     * 创建停用词
     */
    @PostMapping
    public Result<StopWord> create(@RequestBody Map<String, String> body) {
        String word = body.get("word");
        if (word == null || word.trim().isEmpty()) {
            return Result.fail(400, "停用词不能为空");
        }

        StopWord stopWord = new StopWord();
        stopWord.setWord(word.trim().toLowerCase());
        stopWord.setLanguage(body.getOrDefault("language", "zh"));
        stopWord.setEnabled(true);

        try {
            stopWordMapper.insert(stopWord);
            return Result.ok(stopWord);
        } catch (Exception e) {
            return Result.fail(400, "停用词已存在");
        }
    }

    /**
     * 删除停用词
     */
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        stopWordMapper.deleteById(id);
        return Result.ok();
    }

    /**
     * 切换停用词启用状态
     */
    @PutMapping("/{id}/toggle")
    public Result<Void> toggle(@PathVariable Long id) {
        StopWord stopWord = stopWordMapper.selectById(id);
        if (stopWord == null) {
            return Result.fail(404, "停用词不存在");
        }
        stopWord.setEnabled(!stopWord.getEnabled());
        stopWordMapper.updateById(stopWord);
        return Result.ok();
    }
}
