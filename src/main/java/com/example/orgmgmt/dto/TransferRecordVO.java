package com.example.orgmgmt.dto;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 调动记录视图对象
 */
@Data
public class TransferRecordVO {

    private Long id;

    private Long employeeId;

    private Long fromDeptId;

    private String fromDeptName;

    private Long toDeptId;

    private String toDeptName;

    private String fromPosition;

    private String toPosition;

    private String reason;

    private Long operatorId;

    private LocalDateTime createdAt;
}