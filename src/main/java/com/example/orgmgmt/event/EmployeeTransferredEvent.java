package com.example.orgmgmt.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

/**
 * 员工调动事件 - 供其他模块（如审批流）消费
 */
@Getter
public class EmployeeTransferredEvent extends ApplicationEvent {

    private final Long employeeId;
    private final Long fromDeptId;
    private final Long toDeptId;
    private final String newPosition;

    public EmployeeTransferredEvent(Object source, Long employeeId, Long fromDeptId, Long toDeptId, String newPosition) {
        super(source);
        this.employeeId = employeeId;
        this.fromDeptId = fromDeptId;
        this.toDeptId = toDeptId;
        this.newPosition = newPosition;
    }
}