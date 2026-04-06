package com.steeringhub.steering.controller;

import com.steeringhub.domain.model.steering.ReviewAction;
import com.steeringhub.common.exception.BusinessException;
import com.steeringhub.common.response.Result;
import com.steeringhub.common.response.ResultCode;
import com.steeringhub.steering.dto.request.CreateSteeringRequest;
import com.steeringhub.steering.dto.request.UpdateSteeringRequest;
import com.steeringhub.steering.dto.response.SteeringDetailResponse;
import com.steeringhub.steering.entity.Steering;
import com.steeringhub.steering.entity.SteeringCategory;
import com.steeringhub.steering.service.SteeringCategoryService;
import com.steeringhub.steering.service.SteeringService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Tag(name = "MCP 规范提交")
@RestController
@RequestMapping("/api/v1/mcp/steerings")
@RequiredArgsConstructor
public class McpSteeringController {

    private final SteeringService steeringService;
    private final SteeringCategoryService steeringCategoryService;

    @Data
    public static class McpCreateSteeringRequest {
        @NotBlank(message = "规范标题不能为空")
        private String title;

        @NotBlank(message = "规范内容不能为空")
        private String content;

        @NotBlank(message = "规范分类不能为空")
        private String category;

        private List<String> tags;
    }

    @Operation(summary = "MCP 提交新规范（API Key 鉴权，草稿状态）")
    @PostMapping
    public Result<Map<String, Object>> createSteering(@Valid @RequestBody McpCreateSteeringRequest req) {
        SteeringCategory category = steeringCategoryService.lambdaQuery()
                .eq(SteeringCategory::getCode, req.getCategory())
                .eq(SteeringCategory::getEnabled, true)
                .one();
        if (category == null) {
            throw new BusinessException(ResultCode.CATEGORY_NOT_FOUND);
        }

        CreateSteeringRequest createReq = new CreateSteeringRequest();
        createReq.setTitle(req.getTitle());
        createReq.setContent(req.getContent());
        createReq.setCategoryId(category.getId());
        createReq.setTags(req.getTags());

        SteeringDetailResponse detail = steeringService.createSteering(createReq);

        return Result.ok(Map.of(
                "id", detail.getId(),
                "title", detail.getTitle(),
                "status", detail.getStatus().getCode()
        ));
    }

    @Data
    public static class McpReviseSteeringRequest {
        @NotBlank(message = "规范内容不能为空")
        private String content;

        @NotBlank(message = "修改说明不能为空")
        private String changeLog;

        private List<String> tags;
    }

    @Operation(summary = "MCP 提交规范修订（对已有规范提交优化版本，自动进入审核）")
    @PutMapping("/{id}")
    public Result<Map<String, Object>> reviseSteering(@PathVariable Long id,
                                                       @Valid @RequestBody McpReviseSteeringRequest req) {
        Steering steering = steeringService.getById(id);
        if (steering == null) {
            throw new BusinessException(ResultCode.STEERING_NOT_FOUND);
        }

        // Build update request — keep title from original if not changing
        UpdateSteeringRequest updateReq = new UpdateSteeringRequest();
        updateReq.setTitle(steering.getTitle());
        updateReq.setContent(req.getContent());
        updateReq.setTags(req.getTags());
        updateReq.setChangeLog(req.getChangeLog());

        steeringService.updateSteering(id, updateReq);

        // Auto-submit for review
        steeringService.reviewSteering(id, ReviewAction.SUBMIT, "MCP agent 提交修订: " + req.getChangeLog(), null, "mcp-agent");

        return Result.ok(Map.of(
                "id", id,
                "title", steering.getTitle(),
                "status", "pending_review",
                "message", "修订已提交，等待审批"
        ));
    }
}
