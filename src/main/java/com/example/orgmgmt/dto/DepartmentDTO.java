package com.example.orgmgmt.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 部门树节点 DTO
 */
@Data
public class DepartmentDTO {

    private Long id;

    private String name;

    private Long parentId;

    private Integer sortOrder;

    private Long managerId;

    private String status;

    private List<DepartmentDTO> children = new ArrayList<>();

    private LocalDateTime createdAt;
}