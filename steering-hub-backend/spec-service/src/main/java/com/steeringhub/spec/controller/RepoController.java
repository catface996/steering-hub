package com.steeringhub.spec.controller;

import com.steeringhub.common.response.Result;
import com.steeringhub.spec.entity.Repo;
import com.steeringhub.spec.service.RepoService;
import com.steeringhub.spec.service.SpecUsageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Tag(name = "代码仓库管理")
@RestController
@RequestMapping("/api/v1/repos")
@RequiredArgsConstructor
public class RepoController {

    private final RepoService repoService;
    private final SpecUsageService specUsageService;

    @Operation(summary = "注册代码仓库")
    @PostMapping
    public Result<Repo> registerRepo(@RequestParam String name,
                                      @RequestParam String fullName,
                                      @RequestParam(required = false) String description,
                                      @RequestParam(required = false) String url,
                                      @RequestParam(required = false) String language,
                                      @RequestParam(required = false) String team) {
        return Result.ok(repoService.registerRepo(name, fullName, description, url, language, team));
    }

    @Operation(summary = "获取规范使用统计")
    @GetMapping("/stats/usage")
    public Result<List<Map<String, Object>>> getUsageStats(
            @RequestParam(defaultValue = "20") int limit) {
        return Result.ok(specUsageService.getUsageStats(limit));
    }
}
