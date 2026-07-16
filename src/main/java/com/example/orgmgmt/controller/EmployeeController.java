package com.example.orgmgmt.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.example.orgmgmt.common.ApiResponse;
import com.example.orgmgmt.dto.*;
import com.example.orgmgmt.entity.TransferRecord;
import com.example.orgmgmt.service.EmployeeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 员工管理控制器
 */
@RestController
@RequestMapping("/api/employees")
@RequiredArgsConstructor
public class EmployeeController {

    private final EmployeeService employeeService;

    /**
     * 分页查询员工
     */
    @GetMapping
    public ApiResponse<IPage<EmployeeVO>> page(EmployeeQueryRequest request) {
        return ApiResponse.success(employeeService.page(request));
    }

    /**
     * 根据ID查询员工
     */
    @GetMapping("/{id}")
    public ApiResponse<EmployeeVO> getById(@PathVariable Long id) {
        return ApiResponse.success(employeeService.getById(id));
    }

    /**
     * 创建员工
     */
    @PostMapping
    public ApiResponse<EmployeeVO> create(@Valid @RequestBody EmployeeCreateRequest request) {
        return ApiResponse.success(employeeService.create(request));
    }

    /**
     * 更新员工
     */
    @PutMapping("/{id}")
    public ApiResponse<EmployeeVO> update(@PathVariable Long id, @Valid @RequestBody EmployeeUpdateRequest request) {
        return ApiResponse.success(employeeService.update(id, request));
    }

    /**
     * 检查字段值是否已存在
     */
    @GetMapping("/check")
    public ApiResponse<EmployeeCheckResponse> check(@RequestParam String field, @RequestParam String value) {
        return ApiResponse.success(employeeService.check(field, value));
    }

    /**
     * 员工调动
     */
    @PostMapping("/{id}/transfer")
    public ApiResponse<Void> transfer(@PathVariable Long id, @Valid @RequestBody EmployeeTransferRequest request) {
        employeeService.transfer(id, request);
        return ApiResponse.success(null);
    }

    /**
     * 员工离职
     */
    @PutMapping("/{id}/resign")
    public ApiResponse<Void> resign(@PathVariable Long id, @Valid @RequestBody EmployeeResignRequest request) {
        employeeService.resign(id, request);
        return ApiResponse.success(null);
    }

    /**
     * 员工复职
     */
    @PutMapping("/{id}/reinstate")
    public ApiResponse<Void> reinstate(@PathVariable Long id, @Valid @RequestBody EmployeeReinstateRequest request) {
        employeeService.reinstate(id, request);
        return ApiResponse.success(null);
    }

    /**
     * 获取调动历史
     */
    @GetMapping("/{id}/transfer-history")
    public ApiResponse<List<TransferRecord>> getTransferHistory(@PathVariable Long id) {
        return ApiResponse.success(employeeService.getTransferHistory(id));
    }
}