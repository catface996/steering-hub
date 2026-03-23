package com.steeringhub.steering.controller;

import com.steeringhub.common.response.PageResult;
import com.steeringhub.common.response.Result;
import com.steeringhub.steering.dto.request.RepoCreateRequest;
import com.steeringhub.steering.dto.request.RepoQueryRequest;
import com.steeringhub.steering.dto.request.RepoSteeringBindRequest;
import com.steeringhub.steering.dto.request.RepoUpdateRequest;
import com.steeringhub.steering.dto.response.BindingResultResponse;
import com.steeringhub.steering.dto.response.RepoSteeringItem;
import com.steeringhub.steering.entity.Repo;
import com.steeringhub.steering.service.RepoService;
import com.steeringhub.steering.service.SteeringUsageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Tag(name = "代码仓库管理")
@RestController
@RequestMapping("/api/v1/web/repos")
@RequiredArgsConstructor
public class RepoController {

    private final RepoService repoService;
    private final SteeringUsageService steeringUsageService;

    @Operation(summary = "获取规范使用统计")
    @GetMapping("/stats/usage")
    public Result<List<Map<String, Object>>> getUsageStats(
            @RequestParam(defaultValue = "20") int limit) {
        return Result.ok(steeringUsageService.getUsageStats(limit));
    }

    @Operation(summary = "注册/创建代码仓库")
    @PostMapping
    public Result<Repo> createRepo(@Valid @RequestBody RepoCreateRequest request) {
        return Result.ok(repoService.createRepo(request));
    }

    @Operation(summary = "分页查询仓库列表")
    @GetMapping
    public Result<PageResult<Repo>> listRepos(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String team,
            @RequestParam(required = false) Boolean enabled,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        RepoQueryRequest request = new RepoQueryRequest();
        request.setName(name);
        request.setTeam(team);
        request.setEnabled(enabled);
        request.setPage(page);
        request.setSize(size);
        return Result.ok(repoService.listRepos(request));
    }

    @Operation(summary = "获取仓库详情")
    @GetMapping("/{id}")
    public Result<Repo> getRepo(@PathVariable Long id) {
        return Result.ok(repoService.getRepo(id));
    }

    @Operation(summary = "更新仓库信息")
    @PutMapping("/{id}")
    public Result<Repo> updateRepo(@PathVariable Long id,
                                   @Valid @RequestBody RepoUpdateRequest request) {
        return Result.ok(repoService.updateRepo(id, request));
    }

    @Operation(summary = "切换仓库启用/停用状态")
    @PatchMapping("/{id}/toggle")
    public Result<Repo> toggleRepo(@PathVariable Long id) {
        return Result.ok(repoService.toggleRepo(id));
    }

    @Operation(summary = "删除仓库（软删除，同步删除绑定关系）")
    @DeleteMapping("/{id}")
    public Result<Void> deleteRepo(@PathVariable Long id) {
        repoService.deleteRepo(id);
        return Result.ok();
    }

    // ----------- Binding endpoints -----------

    @Operation(summary = "获取仓库绑定的规范列表（分页）")
    @GetMapping("/{repoId}/steerings")
    public Result<PageResult<RepoSteeringItem>> listSteeringsByRepo(
            @PathVariable Long repoId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        return Result.ok(repoService.listSteeringsByRepo(repoId, page, size));
    }

    @Operation(summary = "绑定或更新规范（幂等 upsert）")
    @PutMapping("/{repoId}/steerings/{steeringId}")
    public Result<BindingResultResponse> bindSteering(
            @PathVariable Long repoId,
            @PathVariable Long steeringId,
            @RequestBody(required = false) RepoSteeringBindRequest request) {
        if (request == null) request = new RepoSteeringBindRequest();
        return Result.ok(repoService.bindSteering(repoId, steeringId, request));
    }

    @Operation(summary = "解除绑定关系（物理删除）")
    @DeleteMapping("/{repoId}/steerings/{steeringId}")
    public Result<Void> unbindSteering(
            @PathVariable Long repoId,
            @PathVariable Long steeringId) {
        repoService.unbindSteering(repoId, steeringId);
        return Result.ok();
    }
}
