package com.example.orgmgmt.service;

import com.example.orgmgmt.common.BusinessException;
import com.example.orgmgmt.common.Constants;
import com.example.orgmgmt.dto.DepartmentCreateRequest;
import com.example.orgmgmt.dto.DepartmentDTO;
import com.example.orgmgmt.dto.DepartmentMoveRequest;
import com.example.orgmgmt.dto.DepartmentUpdateRequest;
import com.example.orgmgmt.entity.Department;
import com.example.orgmgmt.mapper.DepartmentMapper;
import com.example.orgmgmt.mapper.EmployeeMapper;
import com.example.orgmgmt.service.impl.DepartmentServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * DepartmentServiceImpl 单元测试
 *
 * 使用 Mockito 模拟 DepartmentMapper 和 EmployeeMapper，
 * 不连接真实数据库。
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("DepartmentServiceImpl 单元测试")
class DepartmentServiceImplTest {

    @Mock
    private DepartmentMapper departmentMapper;

    @Mock
    private EmployeeMapper employeeMapper;

    @InjectMocks
    private DepartmentServiceImpl departmentService;

    // ==================== 辅助方法 ====================

    /**
     * 创建一个 Department 实体，模拟 insert 后 id 被回填。
     */
    private Department buildDept(Long id, String name, Long parentId, String path,
                                 int sortOrder, String status) {
        Department dept = new Department();
        dept.setId(id);
        dept.setName(name);
        dept.setParentId(parentId);
        dept.setPath(path);
        dept.setSortOrder(sortOrder);
        dept.setManagerId(null);
        dept.setStatus(status);
        dept.setVersion(1);
        return dept;
    }

    /**
     * 模拟 insert 行为：将 id 回填到 Department 对象上。
     */
    private void mockInsertWithId(Department dept, Long id) {
        doAnswer(invocation -> {
            Department arg = invocation.getArgument(0);
            arg.setId(id);
            return 1;
        }).when(departmentMapper).insert(dept);
    }

    // ========================================================================
    // getTree() 测试
    // ========================================================================

    @Nested
    @DisplayName("getTree() — 部门树查询")
    class GetTreeTests {

        @Test
        @DisplayName("空数据：返回空列表")
        void shouldReturnEmptyListWhenNoDepartments() {
            when(departmentMapper.selectList(any())).thenReturn(Collections.emptyList());

            List<DepartmentDTO> tree = departmentService.getTree();

            assertNotNull(tree);
            assertTrue(tree.isEmpty());
            verify(departmentMapper, times(1)).selectList(any());
        }

        @Test
        @DisplayName("单层树：一个根部门无子部门")
        void shouldReturnSingleRootWithNoChildren() {
            Department root = buildDept(1L, "总公司", null, "1", 0, Constants.STATUS_ACTIVE);
            when(departmentMapper.selectList(any())).thenReturn(Collections.singletonList(root));

            List<DepartmentDTO> tree = departmentService.getTree();

            assertNotNull(tree);
            assertEquals(1, tree.size());
            DepartmentDTO rootDTO = tree.get(0);
            assertEquals(1L, rootDTO.getId());
            assertEquals("总公司", rootDTO.getName());
            assertNull(rootDTO.getParentId());
            assertNotNull(rootDTO.getChildren());
            assertTrue(rootDTO.getChildren().isEmpty());
        }

        @Test
        @DisplayName("多层树：根→子→孙，验证树结构正确")
        void shouldBuildMultiLevelTree() {
            Department root = buildDept(1L, "总公司", null, "1", 0, Constants.STATUS_ACTIVE);
            Department child1 = buildDept(2L, "技术部", 1L, "1-2", 0, Constants.STATUS_ACTIVE);
            Department child2 = buildDept(3L, "市场部", 1L, "1-3", 1, Constants.STATUS_ACTIVE);
            Department grandchild = buildDept(4L, "前端组", 2L, "1-2-4", 0, Constants.STATUS_ACTIVE);
            when(departmentMapper.selectList(any()))
                    .thenReturn(Arrays.asList(root, child1, child2, grandchild));

            List<DepartmentDTO> tree = departmentService.getTree();

            assertEquals(1, tree.size());
            DepartmentDTO rootDTO = tree.get(0);
            assertEquals("总公司", rootDTO.getName());
            assertEquals(2, rootDTO.getChildren().size());

            // 子节点按 sort_order 排序：技术部在前，市场部在后
            DepartmentDTO firstChild = rootDTO.getChildren().get(0);
            assertEquals("技术部", firstChild.getName());
            assertEquals(1, firstChild.getChildren().size());

            DepartmentDTO secondChild = rootDTO.getChildren().get(1);
            assertEquals("市场部", secondChild.getName());
            assertTrue(secondChild.getChildren().isEmpty());

            // 孙子节点
            DepartmentDTO grandchildDTO = firstChild.getChildren().get(0);
            assertEquals("前端组", grandchildDTO.getName());
            assertTrue(grandchildDTO.getChildren().isEmpty());
        }

        @Test
        @DisplayName("排除非 active 状态部门")
        void shouldExcludeInactiveDepartments() {
            // 查询只返回 active 状态的部门，inactive 的不会出现在 selectList 中
            Department root = buildDept(1L, "总公司", null, "1", 0, Constants.STATUS_ACTIVE);
            when(departmentMapper.selectList(any())).thenReturn(Collections.singletonList(root));

            List<DepartmentDTO> tree = departmentService.getTree();

            assertEquals(1, tree.size());
            // 验证只查询了 active = active 的部门
            verify(departmentMapper, times(1)).selectList(any());
        }
    }

    // ========================================================================
    // getChildren(Long parentId) 测试
    // ========================================================================

    @Nested
    @DisplayName("getChildren(Long parentId) — 懒加载子节点")
    class GetChildrenTests {

        @Test
        @DisplayName("正常返回子部门列表（按 sort_order 排序）")
        void shouldReturnChildrenSortedBySortOrder() {
            Department child1 = buildDept(2L, "研发部", 1L, "1-2", 2, Constants.STATUS_ACTIVE);
            Department child2 = buildDept(3L, "行政部", 1L, "1-3", 1, Constants.STATUS_ACTIVE);
            // 注意：selectList 返回的顺序由 wrapper 中的 orderByAsc(sortOrder) 决定
            // 这里 mock 返回已经排序好的结果
            when(departmentMapper.selectList(any())).thenReturn(Arrays.asList(child2, child1));

            List<DepartmentDTO> children = departmentService.getChildren(1L);

            assertEquals(2, children.size());
            assertEquals("行政部", children.get(0).getName()); // sortOrder=1 在前
            assertEquals("研发部", children.get(1).getName()); // sortOrder=2 在后
            verify(departmentMapper, times(1)).selectList(any());
        }

        @Test
        @DisplayName("无子部门返回空列表")
        void shouldReturnEmptyListWhenNoChildren() {
            when(departmentMapper.selectList(any())).thenReturn(Collections.emptyList());

            List<DepartmentDTO> children = departmentService.getChildren(999L);

            assertNotNull(children);
            assertTrue(children.isEmpty());
        }

        @Test
        @DisplayName("排除非 active 状态")
        void shouldExcludeInactiveChildren() {
            // inactive 状态的部门不会出现在 selectList 结果中
            Department child = buildDept(2L, "研发部", 1L, "1-2", 0, Constants.STATUS_ACTIVE);
            when(departmentMapper.selectList(any())).thenReturn(Collections.singletonList(child));

            List<DepartmentDTO> children = departmentService.getChildren(1L);

            assertEquals(1, children.size());
            assertEquals("active", children.get(0).getStatus());
        }
    }

    // ========================================================================
    // create(DepartmentCreateRequest) 测试
    // ========================================================================

    @Nested
    @DisplayName("create(DepartmentCreateRequest) — 创建部门")
    class CreateTests {

        @Test
        @DisplayName("正常创建根部门（无 parentId）")
        void shouldCreateRootDepartment() {
            DepartmentCreateRequest request = new DepartmentCreateRequest();
            request.setName("总公司");
            request.setParentId(null);
            request.setSortOrder(0);
            request.setManagerId(null);

            // 模拟 insert，设置 id=1
            doAnswer(invocation -> {
                Department arg = invocation.getArgument(0);
                arg.setId(1L);
                return 1;
            }).when(departmentMapper).insert(any(Department.class));

            Department result = departmentService.create(request);

            assertNotNull(result);
            assertEquals(1L, result.getId());
            assertEquals("总公司", result.getName());
            assertEquals("1", result.getPath());
            assertEquals(Constants.STATUS_ACTIVE, result.getStatus());
            assertNull(result.getParentId());

            // 验证 insert 被调用
            verify(departmentMapper, times(1)).insert(any(Department.class));
            // 验证 updateById 被调用以设置 path
            verify(departmentMapper, times(1)).updateById(any(Department.class));
        }

        @Test
        @DisplayName("带 parentId 创建，验证 path 正确设置")
        void shouldCreateChildDepartmentWithCorrectPath() {
            Department parent = buildDept(1L, "总公司", null, "1", 0, Constants.STATUS_ACTIVE);
            when(departmentMapper.selectById(1L)).thenReturn(parent);

            DepartmentCreateRequest request = new DepartmentCreateRequest();
            request.setName("技术部");
            request.setParentId(1L);
            request.setSortOrder(0);

            doAnswer(invocation -> {
                Department arg = invocation.getArgument(0);
                arg.setId(2L);
                return 1;
            }).when(departmentMapper).insert(any(Department.class));

            Department result = departmentService.create(request);

            assertNotNull(result);
            assertEquals(2L, result.getId());
            assertEquals("技术部", result.getName());
            assertEquals(1L, result.getParentId());
            assertEquals("1-2", result.getPath());

            // 验证 parent 被查询了两次：一次校验，一次设置 path
            verify(departmentMapper, times(2)).selectById(1L);
            verify(departmentMapper, times(1)).insert(any(Department.class));
            verify(departmentMapper, times(1)).updateById(any(Department.class));
        }

        @Test
        @DisplayName("父部门不存在 → 抛 BusinessException")
        void shouldThrowExceptionWhenParentNotFound() {
            when(departmentMapper.selectById(999L)).thenReturn(null);

            DepartmentCreateRequest request = new DepartmentCreateRequest();
            request.setName("不存在的子部门");
            request.setParentId(999L);

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> departmentService.create(request));
            assertEquals(Constants.CODE_BAD_REQUEST, ex.getCode());
            assertTrue(ex.getMsg().contains("父部门不存在"));
            verify(departmentMapper, never()).insert(any());
        }

        @Test
        @DisplayName("超过 6 层深度 → 抛 BusinessException")
        void shouldThrowExceptionWhenDepthExceedsMax() {
            // 构造一个深度为6的父部门（path 包含5个 '-'，即6层）
            Department parent = buildDept(6L, "第六层", 5L, "1-2-3-4-5-6", 0, Constants.STATUS_ACTIVE);
            when(departmentMapper.selectById(6L)).thenReturn(parent);

            DepartmentCreateRequest request = new DepartmentCreateRequest();
            request.setName("第七层");
            request.setParentId(6L);

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> departmentService.create(request));
            assertEquals(Constants.CODE_BAD_REQUEST, ex.getCode());
            assertTrue(ex.getMsg().contains("层级已达上限"));
            verify(departmentMapper, never()).insert(any());
        }
    }

    // ========================================================================
    // update(Long id, DepartmentUpdateRequest) 测试
    // ========================================================================

    @Nested
    @DisplayName("update(Long id, DepartmentUpdateRequest) — 更新部门")
    class UpdateTests {

        @Test
        @DisplayName("正常更新")
        void shouldUpdateDepartmentSuccessfully() {
            Department existing = buildDept(1L, "旧名称", null, "1", 0, Constants.STATUS_ACTIVE);
            when(departmentMapper.selectById(1L)).thenReturn(existing);

            DepartmentUpdateRequest request = new DepartmentUpdateRequest();
            request.setName("新名称");
            request.setSortOrder(10);
            request.setManagerId(100L);

            Department result = departmentService.update(1L, request);

            assertNotNull(result);
            assertEquals("新名称", result.getName());
            assertEquals(10, result.getSortOrder());
            assertEquals(100L, result.getManagerId());
            verify(departmentMapper, times(1)).updateById(existing);
        }

        @Test
        @DisplayName("部门不存在 → 抛 BusinessException")
        void shouldThrowExceptionWhenDepartmentNotFound() {
            when(departmentMapper.selectById(999L)).thenReturn(null);

            DepartmentUpdateRequest request = new DepartmentUpdateRequest();
            request.setName("不存在的部门");

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> departmentService.update(999L, request));
            assertEquals(Constants.CODE_NOT_FOUND, ex.getCode());
            assertTrue(ex.getMsg().contains("部门不存在"));
            verify(departmentMapper, never()).updateById(any());
        }
    }

    // ========================================================================
    // delete(Long id) 测试
    // ========================================================================

    @Nested
    @DisplayName("delete(Long id) — 删除部门")
    class DeleteTests {

        @Test
        @DisplayName("正常逻辑删除（status 改为 inactive）")
        void shouldDeleteDepartmentLogically() {
            Department dept = buildDept(1L, "待删除部门", null, "1", 0, Constants.STATUS_ACTIVE);
            when(departmentMapper.selectById(1L)).thenReturn(dept);
            when(departmentMapper.selectCount(any())).thenReturn(0L);
            when(employeeMapper.selectCount(any())).thenReturn(0L);

            departmentService.delete(1L);

            // 验证 status 被改为 inactive
            assertEquals(Constants.STATUS_INACTIVE, dept.getStatus());
            verify(departmentMapper, times(1)).updateById(dept);
        }

        @Test
        @DisplayName("有子部门 → 抛 BusinessException")
        void shouldThrowExceptionWhenHasChildren() {
            Department dept = buildDept(1L, "有子部门", null, "1", 0, Constants.STATUS_ACTIVE);
            when(departmentMapper.selectById(1L)).thenReturn(dept);
            // 子部门 count > 0
            when(departmentMapper.selectCount(any())).thenReturn(3L);

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> departmentService.delete(1L));
            assertEquals(Constants.CODE_BAD_REQUEST, ex.getCode());
            assertTrue(ex.getMsg().contains("存在子部门"));
            verify(departmentMapper, never()).updateById(any());
        }

        @Test
        @DisplayName("有在职员工 → 抛 BusinessException")
        void shouldThrowExceptionWhenHasActiveEmployees() {
            Department dept = buildDept(1L, "有员工", null, "1", 0, Constants.STATUS_ACTIVE);
            when(departmentMapper.selectById(1L)).thenReturn(dept);
            // 子部门 count = 0，但员工 count > 0
            when(departmentMapper.selectCount(any())).thenReturn(0L);
            when(employeeMapper.selectCount(any())).thenReturn(5L);

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> departmentService.delete(1L));
            assertEquals(Constants.CODE_BAD_REQUEST, ex.getCode());
            assertTrue(ex.getMsg().contains("存在子部门或人员"));
            verify(departmentMapper, never()).updateById(any());
        }

        @Test
        @DisplayName("部门不存在 → 抛 BusinessException")
        void shouldThrowExceptionWhenDepartmentNotFound() {
            when(departmentMapper.selectById(999L)).thenReturn(null);

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> departmentService.delete(999L));
            assertEquals(Constants.CODE_NOT_FOUND, ex.getCode());
            assertTrue(ex.getMsg().contains("部门不存在"));
            verify(departmentMapper, never()).updateById(any());
        }
    }

    // ========================================================================
    // move(Long id, DepartmentMoveRequest) 测试
    // ========================================================================

    @Nested
    @DisplayName("move(Long id, DepartmentMoveRequest) — 移动部门")
    class MoveTests {

        @Test
        @DisplayName("正常移动到新父部门（更新 parentId 和 path）")
        void shouldMoveDepartmentSuccessfully() {
            // 待移动部门：技术部 (id=2, path=1-2)
            Department dept = buildDept(2L, "技术部", 1L, "1-2", 0, Constants.STATUS_ACTIVE);
            // 新父部门：产品部 (id=3, path=1-3)
            Department newParent = buildDept(3L, "产品部", 1L, "1-3", 0, Constants.STATUS_ACTIVE);

            when(departmentMapper.selectById(2L)).thenReturn(dept);
            when(departmentMapper.selectById(3L)).thenReturn(newParent);
            when(departmentMapper.selectDescendants(anyString())).thenReturn(Collections.emptyList());

            DepartmentMoveRequest request = new DepartmentMoveRequest();
            request.setNewParentId(3L);

            departmentService.move(2L, request);

            assertEquals(3L, dept.getParentId());
            assertEquals("1-3-2", dept.getPath());
            verify(departmentMapper, times(1)).updateById(dept);
            // 级联更新子孙 path
            verify(departmentMapper, times(1)).update(isNull(), any());
        }

        @Test
        @DisplayName("目标父部门不存在 → 抛 BusinessException")
        void shouldThrowExceptionWhenTargetParentNotFound() {
            Department dept = buildDept(2L, "技术部", 1L, "1-2", 0, Constants.STATUS_ACTIVE);
            when(departmentMapper.selectById(2L)).thenReturn(dept);
            when(departmentMapper.selectById(999L)).thenReturn(null);

            DepartmentMoveRequest request = new DepartmentMoveRequest();
            request.setNewParentId(999L);

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> departmentService.move(2L, request));
            assertEquals(Constants.CODE_BAD_REQUEST, ex.getCode());
            assertTrue(ex.getMsg().contains("目标父部门不存在"));
            verify(departmentMapper, never()).updateById(any());
        }

        @Test
        @DisplayName("试图移动到自身 → 抛 BusinessException")
        void shouldThrowExceptionWhenMovingToSelf() {
            Department dept = buildDept(1L, "总公司", null, "1", 0, Constants.STATUS_ACTIVE);
            when(departmentMapper.selectById(1L)).thenReturn(dept);
            // 选择自身作为新父部门时，selectById 返回同一个对象
            // 此时 newParent.getPath().startsWith(dept.getPath()) 为 true

            DepartmentMoveRequest request = new DepartmentMoveRequest();
            request.setNewParentId(1L);

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> departmentService.move(1L, request));
            assertEquals(Constants.CODE_BAD_REQUEST, ex.getCode());
            assertTrue(ex.getMsg().contains("不能将部门移动到自身"));
            verify(departmentMapper, never()).updateById(any());
        }

        @Test
        @DisplayName("试图移动到子孙节点（循环引用）→ 抛 BusinessException")
        void shouldThrowExceptionWhenMovingToDescendant() {
            // 总公司 (id=1, path=1)
            Department dept = buildDept(1L, "总公司", null, "1", 0, Constants.STATUS_ACTIVE);
            // 尝试将总公司移动到其子孙部门下 (id=3, path=1-2-3)
            Department descendant = buildDept(3L, "孙子部门", 2L, "1-2-3", 0, Constants.STATUS_ACTIVE);

            when(departmentMapper.selectById(1L)).thenReturn(dept);
            when(departmentMapper.selectById(3L)).thenReturn(descendant);

            DepartmentMoveRequest request = new DepartmentMoveRequest();
            request.setNewParentId(3L);

            // descendant.path (1-2-3) starts with dept.path (1) → 循环引用
            BusinessException ex = assertThrows(BusinessException.class,
                    () -> departmentService.move(1L, request));
            assertEquals(Constants.CODE_BAD_REQUEST, ex.getCode());
            assertTrue(ex.getMsg().contains("不能将部门移动到自身或子孙部门下"));
            verify(departmentMapper, never()).updateById(any());
        }
    }
}