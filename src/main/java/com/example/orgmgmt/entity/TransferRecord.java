package com.example.orgmgmt.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 调动记录实体
 */
@Data
@TableName("transfer_records")
public class TransferRecord {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long employeeId;

    private Long fromDeptId;

    private Long toDeptId;

    private String fromPosition;

    private String toPosition;

    private String reason;

    private Long operatorId;

    private LocalDateTime createdAt;
}