package com.example.orgmgmt.service;

import com.example.orgmgmt.dto.DepartmentCreateRequest;
import com.example.orgmgmt.dto.DepartmentDTO;
import com.example.orgmgmt.dto.DepartmentMoveRequest;
import com.example.orgmgmt.dto.DepartmentUpdateRequest;
import com.example.orgmgmt.entity.Department;

import java.util.List;

/**
 * 部门服务接口
 */
public interface DepartmentService {

    /**
     * 获取完整部门树
     */
    List<DepartmentDTO> getTree();

    /**
     * 获取直接子部门（懒加载）
     */
    List<DepartmentDTO> getChildren(Long parentId);

    /**
     * 创建部门
     */
    Department create(DepartmentCreateRequest request);

    /**
     * 更新部门
     */
    Department update(Long id, DepartmentUpdateRequest request);

    /**
     * 删除部门
     */
    void delete(Long id);

    /**
     * 移动部门
     */
    void move(Long id, DepartmentMoveRequest request);
}