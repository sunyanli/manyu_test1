package com.example.orgmgmt.controller;

import com.example.orgmgmt.common.ApiResponse;
import com.example.orgmgmt.dto.DepartmentCreateRequest;
import com.example.orgmgmt.dto.DepartmentDTO;
import com.example.orgmgmt.dto.DepartmentMoveRequest;
import com.example.orgmgmt.dto.DepartmentUpdateRequest;
import com.example.orgmgmt.entity.Department;
import com.example.orgmgmt.service.DepartmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 部门管理控制器
 */
@RestController
@RequestMapping("/api/departments")
@RequiredArgsConstructor
public class DepartmentController {

    private final DepartmentService departmentService;

    /**
     * 获取部门树
     */
    @PreAuthorize("hasAnyRole('ADMIN', 'HR', 'DEPT_MANAGER')")
    @GetMapping("/tree")
    public ApiResponse<List<DepartmentDTO>> getTree() {
        List<DepartmentDTO> tree = departmentService.getTree();
        return ApiResponse.success(tree);
    }

    /**
     * 获取指定部门的子部门列表（懒加载）
     */
    @PreAuthorize("hasAnyRole('ADMIN', 'HR', 'DEPT_MANAGER')")
    @GetMapping("/{id}/children")
    public ApiResponse<List<DepartmentDTO>> getChildren(@PathVariable Long id) {
        List<DepartmentDTO> children = departmentService.getChildren(id);
        return ApiResponse.success(children);
    }

    /**
     * 创建部门
     */
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ApiResponse<Department> create(@Valid @RequestBody DepartmentCreateRequest request) {
        Department dept = departmentService.create(request);
        return ApiResponse.success(dept);
    }

    /**
     * 更新部门
     */
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ApiResponse<Department> update(@PathVariable Long id, @Valid @RequestBody DepartmentUpdateRequest request) {
        Department dept = departmentService.update(id, request);
        return ApiResponse.success(dept);
    }

    /**
     * 删除部门（逻辑删除）
     */
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ApiResponse<String> delete(@PathVariable Long id) {
        departmentService.delete(id);
        return ApiResponse.success("删除成功");
    }

    /**
     * 移动部门
     */
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}/move")
    public ApiResponse<String> move(@PathVariable Long id, @Valid @RequestBody DepartmentMoveRequest request) {
        departmentService.move(id, request);
        return ApiResponse.success("移动成功");
    }
}
