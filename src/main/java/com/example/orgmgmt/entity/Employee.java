package com.example.orgmgmt.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 员工实体
 */
@Data
@TableName("employees")
public class Employee {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String name;

    private String employeeNo;

    private String phone;

    private String email;

    private Long deptId;

    private String position;

    private LocalDate hireDate;

    private LocalDate resignDate;

    private String status;

    private Boolean loginEnabled;

    @Version
    private Integer version;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}