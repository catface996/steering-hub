package com.steeringhub.controller;

import com.steeringhub.application.api.service.AuthApplicationService;
import com.steeringhub.common.response.Result;
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

    private final AuthApplicationService authApplicationService;

    @GetMapping
    public Result<List<Map<String, Object>>> list() {
        return Result.ok(authApplicationService.listStopWords());
    }

    @PostMapping
    public Result<Map<String, Object>> create(@RequestBody Map<String, String> body) {
        String word = body.get("word");
        if (word == null || word.trim().isEmpty()) {
            return Result.fail(400, "停用词不能为空");
        }
        return Result.ok(authApplicationService.createStopWord(word, body.getOrDefault("language", "zh")));
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        authApplicationService.deleteStopWord(id);
        return Result.ok();
    }

    @PutMapping("/{id}/toggle")
    public Result<Void> toggle(@PathVariable Long id) {
        authApplicationService.toggleStopWord(id);
        return Result.ok();
    }
}
