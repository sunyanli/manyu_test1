package com.example.orgmgmt.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.example.orgmgmt.common.BusinessException;
import com.example.orgmgmt.common.Constants;
import com.example.orgmgmt.dto.*;
import com.example.orgmgmt.entity.*;
import com.example.orgmgmt.mapper.*;
import com.example.orgmgmt.service.impl.EmployeeServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * EmployeeServiceImpl 单元测试
 *
 * 使用 Mockito 模拟所有 Mapper 和 EventPublisher，
 * 不连接真实数据库。
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("EmployeeServiceImpl 单元测试")
class EmployeeServiceImplTest {

    @Mock
    private EmployeeMapper employeeMapper;

    @Mock
    private DepartmentMapper departmentMapper;

    @Mock
    private TransferRecordMapper transferRecordMapper;

    @Mock
    private AuditLogMapper auditLogMapper;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private EmployeeServiceImpl employeeService;

    // ==================== 辅助方法 ====================

    private Employee buildEmployee(Long id, String name, String employeeNo, String phone,
                                   Long deptId, String position, String status, LocalDate hireDate) {
        Employee emp = new Employee();
        emp.setId(id);
        emp.setName(name);
        emp.setEmployeeNo(employeeNo);
        emp.setPhone(phone);
        emp.setEmail(name + "@example.com");
        emp.setDeptId(deptId);
        emp.setPosition(position);
        emp.setStatus(status);
        emp.setHireDate(hireDate);
        emp.setLoginEnabled(true);
        return emp;
    }

    private Department buildDept(Long id, String name, String status) {
        Department dept = new Department();
        dept.setId(id);
        dept.setName(name);
        dept.setStatus(status);
        return dept;
    }

    private EmployeeCreateRequest buildCreateRequest(String name, String employeeNo, String phone,
                                                      Long deptId, String position, LocalDate hireDate) {
        EmployeeCreateRequest req = new EmployeeCreateRequest();
        req.setName(name);
        req.setEmployeeNo(employeeNo);
        req.setPhone(phone);
        req.setDeptId(deptId);
        req.setPosition(position);
        req.setHireDate(hireDate);
        return req;
    }

    /**
     * 模拟 insert 行为：将 id 回填到 Employee 对象上。
     */
    private void mockInsertEmployeeWithId(Long id) {
        doAnswer(invocation -> {
            Employee arg = invocation.getArgument(0);
            arg.setId(id);
            return 1;
        }).when(employeeMapper).insert(any(Employee.class));
    }

    // ==================== create() 测试 ====================

    @Nested
    @DisplayName("create - 员工创建")
    class CreateTests {

        @Test
        @DisplayName("正常创建员工应成功")
        void shouldCreateEmployeeSuccessfully() {
            EmployeeCreateRequest req = buildCreateRequest(
                    "张三", "EMP001", "13800138000", 1L, "Java开发", LocalDate.of(2023, 1, 1));

            when(employeeMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(0L);
            Department dept = buildDept(1L, "研发部", Constants.STATUS_ACTIVE);
            when(departmentMapper.selectById(1L)).thenReturn(dept);
            mockInsertEmployeeWithId(1L);
            when(auditLogMapper.insert(any(AuditLog.class))).thenReturn(1);

            EmployeeVO result = employeeService.create(req);

            assertNotNull(result);
            assertEquals("张三", result.getName());
            assertEquals("EMP001", result.getEmployeeNo());
            assertEquals(Constants.STATUS_ACTIVE, result.getStatus());
            assertTrue(result.getLoginEnabled());

            verify(employeeMapper).insert(any(Employee.class));
            verify(auditLogMapper).insert(any(AuditLog.class));
        }

        @Test
        @DisplayName("工号重复应抛出 BusinessException")
        void shouldThrowWhenEmployeeNoExists() {
            EmployeeCreateRequest req = buildCreateRequest(
                    "张三", "EMP001", "13800138000", 1L, "Java开发", LocalDate.of(2023, 1, 1));

            when(employeeMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(1L);

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> employeeService.create(req));
            assertEquals("工号已存在", ex.getMessage());

            verify(employeeMapper, never()).insert(any(Employee.class));
        }

        @Test
        @DisplayName("手机号重复应抛出 BusinessException")
        void shouldThrowWhenPhoneExists() {
            EmployeeCreateRequest req = buildCreateRequest(
                    "张三", "EMP001", "13800138000", 1L, "Java开发", LocalDate.of(2023, 1, 1));

            // 第一次 selectCount (employeeNo) 返回 0，第二次 (phone) 返回 1
            when(employeeMapper.selectCount(any(LambdaQueryWrapper.class)))
                    .thenReturn(0L).thenReturn(1L);

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> employeeService.create(req));
            assertEquals("手机号已存在", ex.getMessage());

            verify(employeeMapper, never()).insert(any(Employee.class));
        }

        @Test
        @DisplayName("部门不存在应抛出 BusinessException")
        void shouldThrowWhenDeptNotFound() {
            EmployeeCreateRequest req = buildCreateRequest(
                    "张三", "EMP001", "13800138000", 999L, "Java开发", LocalDate.of(2023, 1, 1));

            when(employeeMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(0L);
            when(departmentMapper.selectById(999L)).thenReturn(null);

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> employeeService.create(req));
            assertEquals("部门不存在", ex.getMessage());
        }

        @Test
        @DisplayName("部门未启用应抛出 BusinessException")
        void shouldThrowWhenDeptInactive() {
            EmployeeCreateRequest req = buildCreateRequest(
                    "张三", "EMP001", "13800138000", 1L, "Java开发", LocalDate.of(2023, 1, 1));

            when(employeeMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(0L);
            Department dept = buildDept(1L, "已停用部门", Constants.STATUS_INACTIVE);
            when(departmentMapper.selectById(1L)).thenReturn(dept);

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> employeeService.create(req));
            assertEquals("部门未启用", ex.getMessage());
        }

        @Test
        @DisplayName("phone 为 null 时跳过手机号唯一性校验")
        void shouldSkipPhoneCheckWhenNull() {
            EmployeeCreateRequest req = buildCreateRequest(
                    "张三", "EMP001", null, 1L, "Java开发", LocalDate.of(2023, 1, 1));

            when(employeeMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(0L);
            Department dept = buildDept(1L, "研发部", Constants.STATUS_ACTIVE);
            when(departmentMapper.selectById(1L)).thenReturn(dept);
            mockInsertEmployeeWithId(1L);
            when(auditLogMapper.insert(any(AuditLog.class))).thenReturn(1);

            EmployeeVO result = employeeService.create(req);

            assertNotNull(result);
            // 验证 phone 唯一性校验只执行了一次（employeeNo）
            verify(employeeMapper, times(1)).selectCount(any(LambdaQueryWrapper.class));
        }
    }

    // ==================== transfer() 测试 ====================

    @Nested
    @DisplayName("transfer - 员工调动")
    class TransferTests {

        private EmployeeTransferRequest buildTransferRequest(Long newDeptId, String newPosition, String reason) {
            EmployeeTransferRequest req = new EmployeeTransferRequest();
            req.setNewDeptId(newDeptId);
            req.setNewPosition(newPosition);
            req.setReason(reason);
            return req;
        }

        @Test
        @DisplayName("正常调动应成功")
        void shouldTransferSuccessfully() {
            Employee emp = buildEmployee(1L, "张三", "EMP001", "13800138000",
                    1L, "前端开发", Constants.STATUS_ACTIVE, LocalDate.of(2023, 1, 1));
            EmployeeTransferRequest req = buildTransferRequest(2L, "后端开发", "业务调整");

            when(employeeMapper.selectById(1L)).thenReturn(emp);
            Department newDept = buildDept(2L, "后端组", Constants.STATUS_ACTIVE);
            when(departmentMapper.selectById(2L)).thenReturn(newDept);
            when(employeeMapper.updateById(any(Employee.class))).thenReturn(1);
            when(transferRecordMapper.insert(any(TransferRecord.class))).thenReturn(1);
            when(auditLogMapper.insert(any(AuditLog.class))).thenReturn(1);
            doNothing().when(eventPublisher).publishEvent(any());

            assertDoesNotThrow(() -> employeeService.transfer(1L, req));

            assertEquals(2L, emp.getDeptId());
            assertEquals("后端开发", emp.getPosition());

            verify(transferRecordMapper).insert(any(TransferRecord.class));
            verify(eventPublisher).publishEvent(any());
        }

        @Test
        @DisplayName("员工不存在应抛出 BusinessException")
        void shouldThrowWhenEmployeeNotFound() {
            EmployeeTransferRequest req = buildTransferRequest(2L, "后端开发", "业务调整");

            when(employeeMapper.selectById(1L)).thenReturn(null);

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> employeeService.transfer(1L, req));
            assertEquals("员工不存在", ex.getMessage());
        }

        @Test
        @DisplayName("员工已离职应抛出 BusinessException")
        void shouldThrowWhenEmployeeResigned() {
            Employee emp = buildEmployee(1L, "张三", "EMP001", "13800138000",
                    1L, "前端开发", Constants.STATUS_RESIGNED, LocalDate.of(2023, 1, 1));
            EmployeeTransferRequest req = buildTransferRequest(2L, "后端开发", "业务调整");

            when(employeeMapper.selectById(1L)).thenReturn(emp);

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> employeeService.transfer(1L, req));
            assertEquals("仅在职员工可调动", ex.getMessage());
        }

        @Test
        @DisplayName("目标部门不存在应抛出 BusinessException")
        void shouldThrowWhenTargetDeptNotFound() {
            Employee emp = buildEmployee(1L, "张三", "EMP001", "13800138000",
                    1L, "前端开发", Constants.STATUS_ACTIVE, LocalDate.of(2023, 1, 1));
            EmployeeTransferRequest req = buildTransferRequest(999L, "后端开发", "业务调整");

            when(employeeMapper.selectById(1L)).thenReturn(emp);
            when(departmentMapper.selectById(999L)).thenReturn(null);

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> employeeService.transfer(1L, req));
            assertEquals("目标部门不存在", ex.getMessage());
        }

        @Test
        @DisplayName("目标部门未启用应抛出 BusinessException")
        void shouldThrowWhenTargetDeptInactive() {
            Employee emp = buildEmployee(1L, "张三", "EMP001", "13800138000",
                    1L, "前端开发", Constants.STATUS_ACTIVE, LocalDate.of(2023, 1, 1));
            EmployeeTransferRequest req = buildTransferRequest(2L, "后端开发", "业务调整");

            when(employeeMapper.selectById(1L)).thenReturn(emp);
            Department dept = buildDept(2L, "已停用部门", Constants.STATUS_INACTIVE);
            when(departmentMapper.selectById(2L)).thenReturn(dept);

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> employeeService.transfer(1L, req));
            assertEquals("目标部门未启用", ex.getMessage());
        }
    }

    // ==================== resign() 测试 ====================

    @Nested
    @DisplayName("resign - 员工离职")
    class ResignTests {

        @Test
        @DisplayName("正常离职应成功")
        void shouldResignSuccessfully() {
            Employee emp = buildEmployee(1L, "张三", "EMP001", "13800138000",
                    1L, "Java开发", Constants.STATUS_ACTIVE, LocalDate.of(2023, 1, 1));
            EmployeeResignRequest req = new EmployeeResignRequest();
            req.setResignDate(LocalDate.of(2023, 11, 1));

            when(employeeMapper.selectById(1L)).thenReturn(emp);
            when(employeeMapper.updateById(any(Employee.class))).thenReturn(1);
            when(auditLogMapper.insert(any(AuditLog.class))).thenReturn(1);

            assertDoesNotThrow(() -> employeeService.resign(1L, req));

            assertEquals(Constants.STATUS_RESIGNED, emp.getStatus());
            assertFalse(emp.getLoginEnabled());
            assertEquals(LocalDate.of(2023, 11, 1), emp.getResignDate());
        }

        @Test
        @DisplayName("resignDate 为 null 时也应成功（仅修改状态）")
        void shouldResignWithNullDate() {
            Employee emp = buildEmployee(1L, "张三", "EMP001", "13800138000",
                    1L, "Java开发", Constants.STATUS_ACTIVE, LocalDate.of(2023, 1, 1));
            EmployeeResignRequest req = new EmployeeResignRequest();

            when(employeeMapper.selectById(1L)).thenReturn(emp);
            when(employeeMapper.updateById(any(Employee.class))).thenReturn(1);
            when(auditLogMapper.insert(any(AuditLog.class))).thenReturn(1);

            assertDoesNotThrow(() -> employeeService.resign(1L, req));
            assertEquals(Constants.STATUS_RESIGNED, emp.getStatus());
        }

        @Test
        @DisplayName("员工不存在应抛出 BusinessException")
        void shouldThrowWhenEmployeeNotFound() {
            EmployeeResignRequest req = new EmployeeResignRequest();
            when(employeeMapper.selectById(1L)).thenReturn(null);

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> employeeService.resign(1L, req));
            assertEquals("员工不存在", ex.getMessage());
        }

        @Test
        @DisplayName("已离职员工再次离职应抛出 BusinessException")
        void shouldThrowWhenAlreadyResigned() {
            Employee emp = buildEmployee(1L, "张三", "EMP001", "13800138000",
                    1L, "Java开发", Constants.STATUS_RESIGNED, LocalDate.of(2023, 1, 1));
            EmployeeResignRequest req = new EmployeeResignRequest();

            when(employeeMapper.selectById(1L)).thenReturn(emp);

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> employeeService.resign(1L, req));
            assertEquals("仅在职员工可办理离职", ex.getMessage());
        }

        @Test
        @DisplayName("离职日期早于入职日期应抛出 BusinessException")
        void shouldThrowWhenResignDateBeforeHireDate() {
            Employee emp = buildEmployee(1L, "张三", "EMP001", "13800138000",
                    1L, "Java开发", Constants.STATUS_ACTIVE, LocalDate.of(2023, 6, 1));
            EmployeeResignRequest req = new EmployeeResignRequest();
            req.setResignDate(LocalDate.of(2023, 1, 1));

            when(employeeMapper.selectById(1L)).thenReturn(emp);

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> employeeService.resign(1L, req));
            assertEquals("离职日期不能早于入职日期", ex.getMessage());
        }

        @Test
        @DisplayName("离职日期为未来日期应抛出 BusinessException")
        void shouldThrowWhenResignDateInFuture() {
            Employee emp = buildEmployee(1L, "张三", "EMP001", "13800138000",
                    1L, "Java开发", Constants.STATUS_ACTIVE, LocalDate.of(2023, 1, 1));
            EmployeeResignRequest req = new EmployeeResignRequest();
            req.setResignDate(LocalDate.now().plusDays(1));

            when(employeeMapper.selectById(1L)).thenReturn(emp);

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> employeeService.resign(1L, req));
            assertEquals("离职日期不能为未来日期", ex.getMessage());
        }
    }

    // ==================== reinstate() 测试 ====================

    @Nested
    @DisplayName("reinstate - 员工复职")
    class ReinstateTests {

        @Test
        @DisplayName("正常复职应成功")
        void shouldReinstateSuccessfully() {
            Employee emp = buildEmployee(1L, "张三", "EMP001", "13800138000",
                    1L, "Java开发", Constants.STATUS_RESIGNED, LocalDate.of(2023, 1, 1));
            emp.setLoginEnabled(false);
            emp.setResignDate(LocalDate.of(2023, 11, 1));

            EmployeeReinstateRequest req = new EmployeeReinstateRequest();
            req.setDeptId(1L);
            req.setPosition("Java开发");

            when(employeeMapper.selectById(1L)).thenReturn(emp);
            when(employeeMapper.updateById(any(Employee.class))).thenReturn(1);
            when(auditLogMapper.insert(any(AuditLog.class))).thenReturn(1);

            assertDoesNotThrow(() -> employeeService.reinstate(1L, req));

            assertEquals(Constants.STATUS_ACTIVE, emp.getStatus());
            assertTrue(emp.getLoginEnabled());
            assertNull(emp.getResignDate());
        }

        @Test
        @DisplayName("复职非离职员工应抛出 BusinessException")
        void shouldThrowWhenNotResigned() {
            Employee emp = buildEmployee(1L, "张三", "EMP001", "13800138000",
                    1L, "Java开发", Constants.STATUS_ACTIVE, LocalDate.of(2023, 1, 1));
            EmployeeReinstateRequest req = new EmployeeReinstateRequest();

            when(employeeMapper.selectById(1L)).thenReturn(emp);

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> employeeService.reinstate(1L, req));
            assertEquals("仅离职员工可复职", ex.getMessage());
        }
    }

    // ==================== check() 测试 ====================

    @Nested
    @DisplayName("check - 唯一性校验")
    class CheckTests {

        @Test
        @DisplayName("工号已存在应返回 isExist=true")
        void shouldReturnExistsWhenEmployeeNoFound() {
            when(employeeMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(1L);

            EmployeeCheckResponse result = employeeService.check("employeeNo", "EMP001");

            assertTrue(result.getIsExist());
        }

        @Test
        @DisplayName("工号不存在应返回 isExist=false")
        void shouldReturnNotExistsWhenEmployeeNoNotFound() {
            when(employeeMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(0L);

            EmployeeCheckResponse result = employeeService.check("employeeNo", "EMP999");

            assertFalse(result.getIsExist());
        }

        @Test
        @DisplayName("手机号已存在应返回 isExist=true")
        void shouldReturnExistsWhenPhoneFound() {
            when(employeeMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(1L);

            EmployeeCheckResponse result = employeeService.check("phone", "13800138000");

            assertTrue(result.getIsExist());
        }

        @Test
        @DisplayName("非法字段应抛出 BusinessException")
        void shouldThrowForInvalidField() {
            BusinessException ex = assertThrows(BusinessException.class,
                    () -> employeeService.check("invalidField", "value"));
            assertTrue(ex.getMessage().contains("不支持的校验字段"));
        }
    }

    // ==================== getById() 测试 ====================

    @Nested
    @DisplayName("getById - 查询员工")
    class GetByIdTests {

        @Test
        @DisplayName("正常查询应返回 EmployeeVO")
        void shouldReturnEmployeeVO() {
            Employee emp = buildEmployee(1L, "张三", "EMP001", "13800138000",
                    1L, "Java开发", Constants.STATUS_ACTIVE, LocalDate.of(2023, 1, 1));
            Department dept = buildDept(1L, "研发部", Constants.STATUS_ACTIVE);

            when(employeeMapper.selectById(1L)).thenReturn(emp);
            when(departmentMapper.selectById(1L)).thenReturn(dept);

            EmployeeVO result = employeeService.getById(1L);

            assertNotNull(result);
            assertEquals("张三", result.getName());
            assertEquals("研发部", result.getDeptName());
        }

        @Test
        @DisplayName("员工不存在应抛出 BusinessException")
        void shouldThrowWhenNotFound() {
            when(employeeMapper.selectById(1L)).thenReturn(null);

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> employeeService.getById(1L));
            assertEquals("员工不存在", ex.getMessage());
        }
    }

    // ==================== update() 测试 ====================

    @Nested
    @DisplayName("update - 更新员工")
    class UpdateTests {

        private EmployeeUpdateRequest buildUpdateRequest(String name, String phone, Long deptId, String position) {
            EmployeeUpdateRequest req = new EmployeeUpdateRequest();
            req.setName(name);
            req.setPhone(phone);
            req.setDeptId(deptId);
            req.setPosition(position);
            return req;
        }

        @Test
        @DisplayName("正常更新应成功")
        void shouldUpdateSuccessfully() {
            Employee emp = buildEmployee(1L, "张三", "EMP001", "13800138000",
                    1L, "Java开发", Constants.STATUS_ACTIVE, LocalDate.of(2023, 1, 1));
            EmployeeUpdateRequest req = buildUpdateRequest("张三改", "13900139000", 1L, "高级开发");

            when(employeeMapper.selectById(1L)).thenReturn(emp);
            when(employeeMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(0L);
            Department dept = buildDept(1L, "研发部", Constants.STATUS_ACTIVE);
            when(departmentMapper.selectById(1L)).thenReturn(dept);
            when(employeeMapper.updateById(any(Employee.class))).thenReturn(1);
            when(auditLogMapper.insert(any(AuditLog.class))).thenReturn(1);

            EmployeeVO result = employeeService.update(1L, req);

            assertNotNull(result);
            assertEquals("张三改", result.getName());
            assertEquals("13900139000", result.getPhone());
        }

        @Test
        @DisplayName("员工不存在应抛出 BusinessException")
        void shouldThrowWhenEmployeeNotFound() {
            EmployeeUpdateRequest req = buildUpdateRequest("张三", "13800138000", 1L, "Java开发");
            when(employeeMapper.selectById(1L)).thenReturn(null);

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> employeeService.update(1L, req));
            assertEquals("员工不存在", ex.getMessage());
        }

        @Test
        @DisplayName("离职员工不可编辑")
        void shouldThrowWhenResigned() {
            Employee emp = buildEmployee(1L, "张三", "EMP001", "13800138000",
                    1L, "Java开发", Constants.STATUS_RESIGNED, LocalDate.of(2023, 1, 1));
            EmployeeUpdateRequest req = buildUpdateRequest("张三", "13800138000", 1L, "Java开发");

            when(employeeMapper.selectById(1L)).thenReturn(emp);

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> employeeService.update(1L, req));
            assertEquals("离职员工不可编辑", ex.getMessage());
        }
    }

    // ==================== page() 测试 ====================

    @Nested
    @DisplayName("page - 分页查询")
    class PageTests {

        @Test
        @DisplayName("分页上限保护：pageSize=999999 应被限制为 100")
        void shouldCapPageSize() {
            EmployeeQueryRequest req = new EmployeeQueryRequest();
            req.setPage(1);
            req.setPageSize(999999);

            when(employeeMapper.selectPage(any(Page.class), any(LambdaQueryWrapper.class)))
                    .thenReturn(new Page<>());

            employeeService.page(req);

            ArgumentCaptor<Page<Employee>> pageCaptor = ArgumentCaptor.forClass(Page.class);
            verify(employeeMapper).selectPage(pageCaptor.capture(), any(LambdaQueryWrapper.class));
            assertEquals(100, pageCaptor.getValue().getSize());
        }

        @Test
        @DisplayName("pageSize 为 null 时默认 20")
        void shouldDefaultPageSizeWhenNull() {
            EmployeeQueryRequest req = new EmployeeQueryRequest();
            req.setPage(1);
            req.setPageSize(null);

            when(employeeMapper.selectPage(any(Page.class), any(LambdaQueryWrapper.class)))
                    .thenReturn(new Page<>());

            employeeService.page(req);

            ArgumentCaptor<Page<Employee>> pageCaptor = ArgumentCaptor.forClass(Page.class);
            verify(employeeMapper).selectPage(pageCaptor.capture(), any(LambdaQueryWrapper.class));
            assertEquals(20, pageCaptor.getValue().getSize());
        }

        @Test
        @DisplayName("正常分页查询应返回结果")
        void shouldReturnPageResult() {
            EmployeeQueryRequest req = new EmployeeQueryRequest();
            req.setPage(1);
            req.setPageSize(10);

            Employee emp = buildEmployee(1L, "张三", "EMP001", "13800138000",
                    1L, "Java开发", Constants.STATUS_ACTIVE, LocalDate.of(2023, 1, 1));
            Page<Employee> empPage = new Page<>(1, 10);
            empPage.setRecords(Arrays.asList(emp));
            empPage.setTotal(1);

            when(employeeMapper.selectPage(any(Page.class), any(LambdaQueryWrapper.class)))
                    .thenReturn(empPage);
            Department dept = buildDept(1L, "研发部", Constants.STATUS_ACTIVE);
            when(departmentMapper.selectBatchIds(anyList())).thenReturn(Arrays.asList(dept));

            IPage<EmployeeVO> result = employeeService.page(req);

            assertNotNull(result);
            assertEquals(1, result.getTotal());
            assertEquals("张三", result.getRecords().get(0).getName());
            assertEquals("研发部", result.getRecords().get(0).getDeptName());
        }
    }

    // ==================== getTransferHistory() 测试 ====================

    @Nested
    @DisplayName("getTransferHistory - 调动历史")
    class GetTransferHistoryTests {

        @Test
        @DisplayName("正常查询调动历史")
        void shouldReturnTransferHistory() {
            TransferRecord record = new TransferRecord();
            record.setId(1L);
            record.setEmployeeId(1L);
            record.setFromDeptId(1L);
            record.setToDeptId(2L);
            record.setFromPosition("前端开发");
            record.setToPosition("后端开发");
            record.setReason("业务调整");

            when(transferRecordMapper.selectList(any(LambdaQueryWrapper.class)))
                    .thenReturn(Arrays.asList(record));
            Department fromDept = buildDept(1L, "前端组", Constants.STATUS_ACTIVE);
            Department toDept = buildDept(2L, "后端组", Constants.STATUS_ACTIVE);
            when(departmentMapper.selectBatchIds(anyList()))
                    .thenReturn(Arrays.asList(fromDept, toDept));

            List<TransferRecordVO> result = employeeService.getTransferHistory(1L);

            assertNotNull(result);
            assertEquals(1, result.size());
            assertEquals("前端组", result.get(0).getFromDeptName());
            assertEquals("后端组", result.get(0).getToDeptName());
        }
    }
}