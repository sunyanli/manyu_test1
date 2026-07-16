package com.example.orgmgmt.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 部门实体
 */
@Data
@TableName("departments")
public class Department {

    @TableId(type = IdType.AUTO)
    private Long id;

    @TableField("name")
    private String name;

    @TableField("parent_id")
    private Long parentId;

    @TableField("path")
    private String path;

    @TableField("sort_order")
    private Integer sortOrder;

    @TableField("manager_id")
    private Long managerId;

    @TableField("status")
    private String status;

    @Version
    @TableField("version")
    private Integer version;

    @TableField("created_at")
    private LocalDateTime createdAt;

    @TableField("updated_at")
    private LocalDateTime updatedAt;
}