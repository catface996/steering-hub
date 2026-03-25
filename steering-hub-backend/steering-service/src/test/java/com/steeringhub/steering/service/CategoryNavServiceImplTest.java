package com.steeringhub.steering.service;

import com.steeringhub.common.exception.BusinessException;
import com.steeringhub.steering.dto.response.CategoryNavItem;
import com.steeringhub.steering.dto.response.SteeringNavItem;
import com.steeringhub.steering.mapper.CategoryHierarchyMapper;
import com.steeringhub.steering.mapper.SteeringCategoryMapper;
import com.steeringhub.steering.mapper.SteeringMapper;
import com.steeringhub.steering.service.impl.CategoryNavServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

/**
 * CategoryNavServiceImpl 单元测试
 *
 * 重点覆盖：
 * - BFS 环检测（直接环 / 间接环 / 自环）
 * - listCategories 分支（parentId=null/0 → listTopLevel；>0 → listChildren）
 * - listSteerings limit clamp（[1, 50]）
 * - removeHierarchy 幂等性（不抛异常）
 */
@ExtendWith(MockitoExtension.class)
class CategoryNavServiceImplTest {

    @Mock private CategoryHierarchyMapper categoryHierarchyMapper;
    @Mock private SteeringCategoryMapper steeringCategoryMapper;
    @Mock private SteeringMapper steeringMapper;

    @InjectMocks
    private CategoryNavServiceImpl service;

    // =========================================================================
    // addHierarchy — 自环检测
    // =========================================================================

    @Test
    void addHierarchy_selfLoop_throwsBadRequest() {
        assertThatThrownBy(() -> service.addHierarchy(1L, 1L, 0))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("SELF_LOOP");

        verify(categoryHierarchyMapper, never()).insertRelation(anyLong(), anyLong(), anyInt());
    }

    // =========================================================================
    // addHierarchy — 直接环检测：A → B 已存在，再插入 B → A 时应拒绝
    // =========================================================================

    @Test
    void addHierarchy_directCycle_throwsCycleDetected() {
        // Arrange: 已有关系 A(1) → B(2)。
        // 现在尝试插入 B(2) → A(1)，即 parent=2, child=1。
        // BFS 从 child=1 遍历：selectChildIds(1) 返回 [2]，selectChildIds(2) 返回 []。
        // descendants 包含 1 和 2；parent=2 ∈ descendants → CYCLE_DETECTED。
        when(categoryHierarchyMapper.selectChildIds(1L)).thenReturn(List.of(2L));
        when(categoryHierarchyMapper.selectChildIds(2L)).thenReturn(Collections.emptyList());

        assertThatThrownBy(() -> service.addHierarchy(2L, 1L, 0))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("CYCLE_DETECTED");

        verify(categoryHierarchyMapper, never()).insertRelation(anyLong(), anyLong(), anyInt());
    }

    // =========================================================================
    // addHierarchy — 间接环检测：A→B→C，插入 C→A 时应拒绝
    // =========================================================================

    @Test
    void addHierarchy_indirectCycle_throwsCycleDetected() {
        // Arrange: 已有关系 A(1)→B(2)→C(3)。
        // 尝试插入 C(3) → A(1)，即 parent=3, child=1。
        // BFS 从 child=1 出发：
        //   selectChildIds(1) = [2], selectChildIds(2) = [3], selectChildIds(3) = [].
        //   descendants = {1, 2, 3}; parent=3 ∈ descendants → CYCLE_DETECTED。
        when(categoryHierarchyMapper.selectChildIds(1L)).thenReturn(List.of(2L));
        when(categoryHierarchyMapper.selectChildIds(2L)).thenReturn(List.of(3L));
        when(categoryHierarchyMapper.selectChildIds(3L)).thenReturn(Collections.emptyList());

        assertThatThrownBy(() -> service.addHierarchy(3L, 1L, 0))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("CYCLE_DETECTED");

        verify(categoryHierarchyMapper, never()).insertRelation(anyLong(), anyLong(), anyInt());
    }

    // =========================================================================
    // addHierarchy — 正常场景：无环时 insertRelation 被调用
    // =========================================================================

    @Test
    void addHierarchy_noCycle_callsInsertRelation() {
        // Arrange: child=2 没有任何后代。parent=1 不在 descendants {2} 中。
        when(categoryHierarchyMapper.selectChildIds(2L)).thenReturn(Collections.emptyList());

        service.addHierarchy(1L, 2L, 0);

        verify(categoryHierarchyMapper).insertRelation(1L, 2L, 0);
    }

    @Test
    void addHierarchy_existingSubtree_noOverlapWithParent_succeeds() {
        // Arrange: A(1)→B(2)，B(2)→C(3)。追加 D(4)→A(1)。
        // BFS 从 child=1: {1, 2, 3}; parent=4 ∉ descendants → OK.
        when(categoryHierarchyMapper.selectChildIds(1L)).thenReturn(List.of(2L));
        when(categoryHierarchyMapper.selectChildIds(2L)).thenReturn(List.of(3L));
        when(categoryHierarchyMapper.selectChildIds(3L)).thenReturn(Collections.emptyList());

        service.addHierarchy(4L, 1L, 1);

        verify(categoryHierarchyMapper).insertRelation(4L, 1L, 1);
    }

    // =========================================================================
    // removeHierarchy — 幂等：DELETE 0 行时不抛异常
    // =========================================================================

    @Test
    void removeHierarchy_idempotent_doesNotThrow() {
        doNothing().when(categoryHierarchyMapper).deleteRelation(anyLong(), anyLong());

        service.removeHierarchy(1L, 2L);
        service.removeHierarchy(1L, 2L); // 重复删除

        verify(categoryHierarchyMapper, times(2)).deleteRelation(1L, 2L);
    }

    // =========================================================================
    // listCategories — 路由分支
    // =========================================================================

    @Test
    void listCategories_nullParentId_callsListTopLevel() {
        List<CategoryNavItem> expected = List.of(new CategoryNavItem());
        when(steeringCategoryMapper.listTopLevel()).thenReturn(expected);

        List<CategoryNavItem> result = service.listCategories(null);

        assertThat(result).isSameAs(expected);
        verify(steeringCategoryMapper).listTopLevel();
        verify(steeringCategoryMapper, never()).listChildren(anyLong());
    }

    @Test
    void listCategories_zeroParentId_callsListTopLevel() {
        List<CategoryNavItem> expected = List.of(new CategoryNavItem());
        when(steeringCategoryMapper.listTopLevel()).thenReturn(expected);

        List<CategoryNavItem> result = service.listCategories(0L);

        assertThat(result).isSameAs(expected);
        verify(steeringCategoryMapper).listTopLevel();
        verify(steeringCategoryMapper, never()).listChildren(anyLong());
    }

    @Test
    void listCategories_positiveParentId_callsListChildren() {
        List<CategoryNavItem> expected = List.of(new CategoryNavItem(), new CategoryNavItem());
        when(steeringCategoryMapper.listChildren(5L)).thenReturn(expected);

        List<CategoryNavItem> result = service.listCategories(5L);

        assertThat(result).isSameAs(expected);
        verify(steeringCategoryMapper).listChildren(5L);
        verify(steeringCategoryMapper, never()).listTopLevel();
    }

    // =========================================================================
    // listSteerings — limit clamp
    // =========================================================================

    @Test
    void listSteerings_limitBelowMin_clampsToOne() {
        when(steeringMapper.listActiveByCategory(1L, 1)).thenReturn(Collections.emptyList());

        service.listSteerings(1L, 0);

        verify(steeringMapper).listActiveByCategory(1L, 1);
    }

    @Test
    void listSteerings_limitAboveMax_clampsToFifty() {
        when(steeringMapper.listActiveByCategory(1L, 50)).thenReturn(Collections.emptyList());

        service.listSteerings(1L, 999);

        verify(steeringMapper).listActiveByCategory(1L, 50);
    }

    @Test
    void listSteerings_validLimit_passesThrough() {
        List<SteeringNavItem> expected = List.of(new SteeringNavItem());
        when(steeringMapper.listActiveByCategory(2L, 10)).thenReturn(expected);

        List<SteeringNavItem> result = service.listSteerings(2L, 10);

        assertThat(result).isSameAs(expected);
        verify(steeringMapper).listActiveByCategory(2L, 10);
    }
}
