package com.example.orgmgmt.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.example.orgmgmt.common.BusinessException;
import com.example.orgmgmt.common.Constants;
import com.example.orgmgmt.dto.*;
import com.example.orgmgmt.entity.*;
import com.example.orgmgmt.event.EmployeeTransferredEvent;
import com.example.orgmgmt.mapper.*;
import com.example.orgmgmt.service.EmployeeService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 员工服务实现
 */
@Service
@RequiredArgsConstructor
public class EmployeeServiceImpl implements EmployeeService {

    private final EmployeeMapper employeeMapper;
    private final DepartmentMapper departmentMapper;
    private final TransferRecordMapper transferRecordMapper;
    private final AuditLogMapper auditLogMapper;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    public IPage<EmployeeVO> page(EmployeeQueryRequest request) {
        // 分页上限保护
        if (request.getPageSize() == null || request.getPageSize() <= 0) {
            request.setPageSize(20);
        }
        request.setPageSize(Math.min(request.getPageSize(), 100));

        LambdaQueryWrapper<Employee> wrapper = new LambdaQueryWrapper<>();

        // 部门筛选
        if (request.getDeptId() != null) {
            wrapper.eq(Employee::getDeptId, request.getDeptId());
        }

        // 状态筛选
        if (request.getStatus() != null && !request.getStatus().isEmpty()) {
            wrapper.eq(Employee::getStatus, request.getStatus());
        }

        // 关键字筛选：姓名/工号/手机号
        if (request.getKeyword() != null && !request.getKeyword().isEmpty()) {
            wrapper.and(w -> w
                    .like(Employee::getName, request.getKeyword())
                    .or()
                    .like(Employee::getEmployeeNo, request.getKeyword())
                    .or()
                    .like(Employee::getPhone, request.getKeyword()));
        }

        Page<Employee> page = new Page<>(request.getPage(), request.getPageSize());
        IPage<Employee> employeePage = employeeMapper.selectPage(page, wrapper);

        // 批量查询部门名称
        List<Long> deptIds = employeePage.getRecords().stream()
                .map(Employee::getDeptId)
                .distinct()
                .collect(Collectors.toList());

        Map<Long, String> deptNameMap = Collections.emptyMap();
        if (!deptIds.isEmpty()) {
            List<Department> departments = departmentMapper.selectBatchIds(deptIds);
            deptNameMap = departments.stream()
                    .collect(Collectors.toMap(Department::getId, Department::getName));
        }

        // 转换为 EmployeeVO
        Map<Long, String> finalDeptNameMap = deptNameMap;
        IPage<EmployeeVO> voPage = employeePage.convert(employee -> {
            EmployeeVO vo = new EmployeeVO();
            vo.setId(employee.getId());
            vo.setName(employee.getName());
            vo.setEmployeeNo(employee.getEmployeeNo());
            vo.setPhone(employee.getPhone());
            vo.setEmail(employee.getEmail());
            vo.setDeptId(employee.getDeptId());
            vo.setDeptName(finalDeptNameMap.getOrDefault(employee.getDeptId(), ""));
            vo.setPosition(employee.getPosition());
            vo.setHireDate(employee.getHireDate());
            vo.setStatus(employee.getStatus());
            vo.setLoginEnabled(employee.getLoginEnabled());
            vo.setResignDate(employee.getResignDate());
            vo.setCreatedAt(employee.getCreatedAt());
            vo.setUpdatedAt(employee.getUpdatedAt());
            return vo;
        });

        return voPage;
    }

    @Override
    public EmployeeVO getById(Long id) {
        Employee employee = employeeMapper.selectById(id);
        if (employee == null) {
            throw new BusinessException(Constants.CODE_NOT_FOUND, "员工不存在");
        }
        return toVO(employee);
    }

    @Override
    @Transactional
    public EmployeeVO create(EmployeeCreateRequest request) {
        // 校验 employeeNo 全局唯一
        Long countByNo = employeeMapper.selectCount(
                new LambdaQueryWrapper<Employee>().eq(Employee::getEmployeeNo, request.getEmployeeNo()));
        if (countByNo > 0) {
            throw new BusinessException("工号已存在");
        }

        // 校验 phone 全局唯一
        if (request.getPhone() != null && !request.getPhone().isEmpty()) {
            Long countByPhone = employeeMapper.selectCount(
                    new LambdaQueryWrapper<Employee>().eq(Employee::getPhone, request.getPhone()));
            if (countByPhone > 0) {
                throw new BusinessException("手机号已存在");
            }
        }

        // 校验 deptId 对应的部门存在且 status='active'
        Department dept = departmentMapper.selectById(request.getDeptId());
        if (dept == null) {
            throw new BusinessException("部门不存在");
        }
        if (!Constants.STATUS_ACTIVE.equals(dept.getStatus())) {
            throw new BusinessException("部门未启用");
        }

        // 构建员工实体
        Employee employee = new Employee();
        employee.setName(request.getName());
        employee.setEmployeeNo(request.getEmployeeNo());
        employee.setPhone(request.getPhone());
        employee.setEmail(request.getEmail());
        employee.setDeptId(request.getDeptId());
        employee.setPosition(request.getPosition());
        employee.setHireDate(request.getHireDate());
        employee.setStatus(Constants.STATUS_ACTIVE);
        employee.setLoginEnabled(true);

        employeeMapper.insert(employee);

        // 写入审计日志
        AuditLog auditLog = new AuditLog();
        auditLog.setOperatorId(0L);
        auditLog.setAction("CREATE_EMPLOYEE");
        auditLog.setTargetType("employee");
        auditLog.setTargetId(employee.getId());
        auditLog.setDetail("创建员工：" + employee.getName());
        auditLogMapper.insert(auditLog);

        return toVO(employee);
    }

    @Override
    @Transactional
    public EmployeeVO update(Long id, EmployeeUpdateRequest request) {
        // 校验员工存在
        Employee employee = employeeMapper.selectById(id);
        if (employee == null) {
            throw new BusinessException(Constants.CODE_NOT_FOUND, "员工不存在");
        }

        // 校验员工状态为 active（离职员工不可编辑）
        if (!Constants.STATUS_ACTIVE.equals(employee.getStatus())) {
            throw new BusinessException("离职员工不可编辑");
        }

        // 校验 employeeNo 唯一（排除自身）
        if (request.getName() != null) {
            employee.setName(request.getName());
        }

        // 校验 phone 唯一（排除自身）
        if (request.getPhone() != null) {
            Long countByPhone = employeeMapper.selectCount(
                    new LambdaQueryWrapper<Employee>()
                            .eq(Employee::getPhone, request.getPhone())
                            .ne(Employee::getId, id));
            if (countByPhone > 0) {
                throw new BusinessException("手机号已存在");
            }
            employee.setPhone(request.getPhone());
        }

        // 校验 deptId 合法
        if (request.getDeptId() != null) {
            Department dept = departmentMapper.selectById(request.getDeptId());
            if (dept == null) {
                throw new BusinessException("部门不存在");
            }
            if (!Constants.STATUS_ACTIVE.equals(dept.getStatus())) {
                throw new BusinessException("部门未启用");
            }
            employee.setDeptId(request.getDeptId());
        }

        if (request.getEmail() != null) {
            employee.setEmail(request.getEmail());
        }
        if (request.getPosition() != null) {
            employee.setPosition(request.getPosition());
        }

        employeeMapper.updateById(employee);

        // 写入审计日志
        AuditLog auditLog = new AuditLog();
        auditLog.setOperatorId(0L);
        auditLog.setAction("UPDATE_EMPLOYEE");
        auditLog.setTargetType("employee");
        auditLog.setTargetId(employee.getId());
        auditLog.setDetail("更新员工：" + employee.getName());
        auditLogMapper.insert(auditLog);

        return toVO(employee);
    }

    @Override
    public EmployeeCheckResponse check(String field, String value) {
        LambdaQueryWrapper<Employee> wrapper = new LambdaQueryWrapper<>();

        if ("employeeNo".equals(field)) {
            wrapper.eq(Employee::getEmployeeNo, value);
        } else if ("phone".equals(field)) {
            wrapper.eq(Employee::getPhone, value);
        } else {
            throw new BusinessException("不支持的校验字段：" + field);
        }

        Long count = employeeMapper.selectCount(wrapper);
        return new EmployeeCheckResponse(count > 0);
    }

    @Override
    @Transactional
    public void transfer(Long id, EmployeeTransferRequest request) {
        // 校验员工存在且状态为 active
        Employee employee = employeeMapper.selectById(id);
        if (employee == null) {
            throw new BusinessException(Constants.CODE_NOT_FOUND, "员工不存在");
        }
        if (!Constants.STATUS_ACTIVE.equals(employee.getStatus())) {
            throw new BusinessException("仅在职员工可调动");
        }

        // 校验 newDeptId 有效
        Department newDept = departmentMapper.selectById(request.getNewDeptId());
        if (newDept == null) {
            throw new BusinessException("目标部门不存在");
        }
        if (!Constants.STATUS_ACTIVE.equals(newDept.getStatus())) {
            throw new BusinessException("目标部门未启用");
        }

        // 记录原始 deptId 和 position
        Long fromDeptId = employee.getDeptId();
        String fromPosition = employee.getPosition();

        // 更新 employee 的 deptId 和 position
        employee.setDeptId(request.getNewDeptId());
        employee.setPosition(request.getNewPosition());
        employeeMapper.updateById(employee);

        // 写入 transfer_record
        TransferRecord transferRecord = new TransferRecord();
        transferRecord.setEmployeeId(id);
        transferRecord.setFromDeptId(fromDeptId);
        transferRecord.setToDeptId(request.getNewDeptId());
        transferRecord.setFromPosition(fromPosition);
        transferRecord.setToPosition(request.getNewPosition());
        transferRecord.setReason(request.getReason());
        transferRecord.setOperatorId(0L);
        transferRecordMapper.insert(transferRecord);

        // 写入审计日志
        AuditLog auditLog = new AuditLog();
        auditLog.setOperatorId(0L);
        auditLog.setAction("TRANSFER_EMPLOYEE");
        auditLog.setTargetType("employee");
        auditLog.setTargetId(id);
        auditLog.setDetail("调动员工：" + employee.getName() + "，从部门" + fromDeptId + "到" + request.getNewDeptId());
        auditLogMapper.insert(auditLog);

        // 发布调动事件，供审批流等其他模块消费
        eventPublisher.publishEvent(new EmployeeTransferredEvent(
                this, id, fromDeptId, request.getNewDeptId(), request.getNewPosition()));
    }

    @Override
    @Transactional
    public void resign(Long id, EmployeeResignRequest request) {
        // 校验员工存在且状态为 active
        Employee employee = employeeMapper.selectById(id);
        if (employee == null) {
            throw new BusinessException(Constants.CODE_NOT_FOUND, "员工不存在");
        }
        if (!Constants.STATUS_ACTIVE.equals(employee.getStatus())) {
            throw new BusinessException("仅在职员工可办理离职");
        }

        // 校验 resignDate：不能早于入职日期，不能为未来日期
        if (request.getResignDate() != null) {
            if (request.getResignDate().isBefore(employee.getHireDate())) {
                throw new BusinessException("离职日期不能早于入职日期");
            }
            if (request.getResignDate().isAfter(LocalDate.now())) {
                throw new BusinessException("离职日期不能为未来日期");
            }
        }

        // 更新状态
        employee.setStatus(Constants.STATUS_RESIGNED);
        employee.setLoginEnabled(false);
        employee.setResignDate(request.getResignDate() != null ? request.getResignDate() : LocalDate.now());
        employeeMapper.updateById(employee);

        // 写入审计日志
        AuditLog auditLog = new AuditLog();
        auditLog.setOperatorId(0L);
        auditLog.setAction("RESIGN_EMPLOYEE");
        auditLog.setTargetType("employee");
        auditLog.setTargetId(id);
        auditLog.setDetail("员工离职：" + employee.getName());
        auditLogMapper.insert(auditLog);
    }

    @Override
    @Transactional
    public void reinstate(Long id, EmployeeReinstateRequest request) {
        // 校验员工存在且状态为 resigned
        Employee employee = employeeMapper.selectById(id);
        if (employee == null) {
            throw new BusinessException(Constants.CODE_NOT_FOUND, "员工不存在");
        }
        if (!Constants.STATUS_RESIGNED.equals(employee.getStatus())) {
            throw new BusinessException("仅离职员工可复职");
        }

        // 更新状态
        employee.setStatus(Constants.STATUS_ACTIVE);
        employee.setLoginEnabled(true);
        employee.setDeptId(request.getDeptId());
        employee.setPosition(request.getPosition());
        employee.setResignDate(null);
        employeeMapper.updateById(employee);

        // 写入审计日志
        AuditLog auditLog = new AuditLog();
        auditLog.setOperatorId(0L);
        auditLog.setAction("REINSTATE_EMPLOYEE");
        auditLog.setTargetType("employee");
        auditLog.setTargetId(id);
        auditLog.setDetail("员工复职：" + employee.getName());
        auditLogMapper.insert(auditLog);
    }

    @Override
    public List<TransferRecordVO> getTransferHistory(Long id) {
        LambdaQueryWrapper<TransferRecord> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TransferRecord::getEmployeeId, id)
                .orderByDesc(TransferRecord::getCreatedAt);
        List<TransferRecord> records = transferRecordMapper.selectList(wrapper);

        return records.stream().map(record -> {
            TransferRecordVO vo = new TransferRecordVO();
            vo.setId(record.getId());
            vo.setEmployeeId(record.getEmployeeId());
            vo.setFromDeptId(record.getFromDeptId());
            vo.setToDeptId(record.getToDeptId());
            vo.setFromPosition(record.getFromPosition());
            vo.setToPosition(record.getToPosition());
            vo.setReason(record.getReason());
            vo.setOperatorId(record.getOperatorId());
            vo.setCreatedAt(record.getCreatedAt());

            // 填充部门名称
            if (record.getFromDeptId() != null) {
                Department fromDept = departmentMapper.selectById(record.getFromDeptId());
                if (fromDept != null) {
                    vo.setFromDeptName(fromDept.getName());
                }
            }
            if (record.getToDeptId() != null) {
                Department toDept = departmentMapper.selectById(record.getToDeptId());
                if (toDept != null) {
                    vo.setToDeptName(toDept.getName());
                }
            }
            return vo;
        }).collect(Collectors.toList());
    }

    /**
     * 将 Employee 实体转换为 EmployeeVO，并填充部门名称
     */
    private EmployeeVO toVO(Employee employee) {
        EmployeeVO vo = new EmployeeVO();
        vo.setId(employee.getId());
        vo.setName(employee.getName());
        vo.setEmployeeNo(employee.getEmployeeNo());
        vo.setPhone(employee.getPhone());
        vo.setEmail(employee.getEmail());
        vo.setDeptId(employee.getDeptId());
        vo.setPosition(employee.getPosition());
        vo.setHireDate(employee.getHireDate());
        vo.setStatus(employee.getStatus());
        vo.setLoginEnabled(employee.getLoginEnabled());
        vo.setResignDate(employee.getResignDate());
        vo.setCreatedAt(employee.getCreatedAt());
        vo.setUpdatedAt(employee.getUpdatedAt());

        // 填充部门名称
        if (employee.getDeptId() != null) {
            Department dept = departmentMapper.selectById(employee.getDeptId());
            if (dept != null) {
                vo.setDeptName(dept.getName());
            }
        }

        return vo;
    }
}