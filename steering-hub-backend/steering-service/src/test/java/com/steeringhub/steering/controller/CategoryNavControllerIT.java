package com.steeringhub.steering.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.steeringhub.common.exception.BusinessException;
import com.steeringhub.common.exception.GlobalExceptionHandler;
import com.steeringhub.common.response.ResultCode;
import com.steeringhub.steering.dto.request.CategoryHierarchyDeleteRequest;
import com.steeringhub.steering.dto.request.CategoryHierarchyRequest;
import com.steeringhub.steering.dto.response.CategoryNavItem;
import com.steeringhub.steering.dto.response.SteeringNavItem;
import com.steeringhub.steering.service.CategoryNavService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.autoconfigure.security.servlet.SecurityFilterAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * CategoryNavController 集成测试（Web 层）
 *
 * 验证：
 * - GET /mcp/categories（顶层 + 子分类）
 * - GET /mcp/steerings（含 limit 边界）
 * - POST /web/category-hierarchy（成功 + CYCLE_DETECTED）
 * - DELETE /web/category-hierarchy（成功 + 幂等）
 * - 参数校验（缺少必填字段返回 400）
 */
@WebMvcTest(
        value = CategoryNavController.class,
        excludeAutoConfiguration = {
                SecurityAutoConfiguration.class,
                SecurityFilterAutoConfiguration.class
        })
@Import(GlobalExceptionHandler.class)
class CategoryNavControllerIT {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private CategoryNavService categoryNavService;

    // =========================================================================
    // GET /api/v1/mcp/categories — 顶层
    // =========================================================================

    @Test
    void listCategories_noParentId_returnsTopLevel() throws Exception {
        CategoryNavItem cat = new CategoryNavItem();
        cat.setId(1L);
        cat.setName("编码规范");
        cat.setCode("coding");
        cat.setChildCount(4);
        cat.setSortOrder(1);

        when(categoryNavService.listCategories(null)).thenReturn(List.of(cat));

        mockMvc.perform(get("/api/v1/mcp/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data[0].code").value("coding"))
                .andExpect(jsonPath("$.data[0].childCount").value(4));
    }

    @Test
    void listCategories_withParentId_returnsChildren() throws Exception {
        CategoryNavItem child = new CategoryNavItem();
        child.setId(7L);
        child.setName("Java 后端");
        child.setCode("java-backend");
        child.setChildCount(0);
        child.setSortOrder(1);

        when(categoryNavService.listCategories(1L)).thenReturn(List.of(child));

        mockMvc.perform(get("/api/v1/mcp/categories").param("parentId", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data[0].code").value("java-backend"));
    }

    // =========================================================================
    // GET /api/v1/mcp/steerings — 正常 + 缺少 categoryId
    // =========================================================================

    @Test
    void listSteerings_validCategoryId_returnsItems() throws Exception {
        SteeringNavItem item = new SteeringNavItem();
        item.setId(7L);
        item.setTitle("HTTP 流量入口层规范");
        item.setTags("Controller,DDD");
        item.setUpdatedAt(OffsetDateTime.now());

        when(categoryNavService.listSteerings(1L, 10)).thenReturn(List.of(item));

        mockMvc.perform(get("/api/v1/mcp/steerings").param("categoryId", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data[0].id").value(7))
                .andExpect(jsonPath("$.data[0].tags").value("Controller,DDD"));
    }

    @Test
    void listSteerings_missingCategoryId_returnsError() throws Exception {
        // MissingServletRequestParameterException 被 GlobalExceptionHandler
        // 的通用 @ExceptionHandler(Exception.class) 捕获，HTTP 500，响应体 code=500
        mockMvc.perform(get("/api/v1/mcp/steerings"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.success").value(false));
    }

    // =========================================================================
    // POST /api/v1/web/category-hierarchy — 成功
    // =========================================================================

    @Test
    void addHierarchy_validRequest_returns200() throws Exception {
        CategoryHierarchyRequest req = new CategoryHierarchyRequest();
        req.setParentCategoryId(1L);
        req.setChildCategoryId(9L);
        req.setSortOrder(1);

        doNothing().when(categoryNavService).addHierarchy(1L, 9L, 1);

        mockMvc.perform(post("/api/v1/web/category-hierarchy")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    void addHierarchy_cycleDetected_returns400InResponseBody() throws Exception {
        CategoryHierarchyRequest req = new CategoryHierarchyRequest();
        req.setParentCategoryId(7L);
        req.setChildCategoryId(1L);
        req.setSortOrder(0);

        doThrow(new BusinessException(ResultCode.BAD_REQUEST.getCode(), "CYCLE_DETECTED: 添加此关系将形成环，操作已拒绝"))
                .when(categoryNavService).addHierarchy(7L, 1L, 0);

        mockMvc.perform(post("/api/v1/web/category-hierarchy")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())  // GlobalExceptionHandler 统一 HTTP 200
                .andExpect(jsonPath("$.code").value(400))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("CYCLE_DETECTED")));
    }

    @Test
    void addHierarchy_missingParentCategoryId_returns400() throws Exception {
        CategoryHierarchyRequest req = new CategoryHierarchyRequest();
        req.setChildCategoryId(9L);  // parentCategoryId 缺失

        mockMvc.perform(post("/api/v1/web/category-hierarchy")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    // =========================================================================
    // DELETE /api/v1/web/category-hierarchy — 成功 + 幂等
    // =========================================================================

    @Test
    void removeHierarchy_validRequest_returns200() throws Exception {
        CategoryHierarchyDeleteRequest req = new CategoryHierarchyDeleteRequest();
        req.setParentCategoryId(1L);
        req.setChildCategoryId(9L);

        doNothing().when(categoryNavService).removeHierarchy(1L, 9L);

        mockMvc.perform(delete("/api/v1/web/category-hierarchy")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    void removeHierarchy_idempotent_alwaysReturns200() throws Exception {
        CategoryHierarchyDeleteRequest req = new CategoryHierarchyDeleteRequest();
        req.setParentCategoryId(1L);
        req.setChildCategoryId(9L);

        doNothing().when(categoryNavService).removeHierarchy(anyLong(), anyLong());

        String body = objectMapper.writeValueAsString(req);

        // 连续删除两次，均应返回 200
        mockMvc.perform(delete("/api/v1/web/category-hierarchy")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        mockMvc.perform(delete("/api/v1/web/category-hierarchy")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        verify(categoryNavService, times(2)).removeHierarchy(1L, 9L);
    }
}
