package com.example.orgmgmt.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * 部门树节点 DTO
 */
@Data
public class DepartmentTreeNode {

    /** 部门ID */
    private Long id;

    /** 部门名称 */
    private String name;

    /** 父部门ID */
    private Long parentId;

    /** 路径，如 /1/2/3 */
    private String path;

    /** 排序 */
    private Integer sortOrder;

    /** 部门主管ID */
    private Long managerId;

    /** 状态: active/disbanded */
    private String status;

    /** 子部门列表 */
    private List<DepartmentTreeNode> children = new ArrayList<>();
}