package com.steeringhub.steering.controller;

import com.steeringhub.common.exception.BusinessException;
import com.steeringhub.common.response.Result;
import com.steeringhub.common.response.ResultCode;
import com.steeringhub.steering.dto.request.CreateSteeringRequest;
import com.steeringhub.steering.dto.response.SteeringDetailResponse;
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
}
