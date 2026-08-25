package com.example.approval.event;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * 组织架构事件消费者桩（manyu_test1）
 * 
 * 消费 manyu_test 发布的员工调动/离职事件，
 * 后续迭代实现审批流节点变更、权限回收等逻辑。
 */
@Slf4j
@Component
public class OrgEventConsumer {

    /**
     * 处理员工调动事件
     * 后续：更新该员工相关的默认审批流节点审批人
     */
    public void onEmployeeTransferred(Long employeeId, Long fromDeptId, Long toDeptId,
                                      String fromPosition, String toPosition) {
        log.info("[Approval] 收到员工调动通知: employeeId={}, dept {} -> {}, position {} -> {}",
                employeeId, fromDeptId, toDeptId, fromPosition, toPosition);
        // TODO: 查询该员工参与的审批流，更新审批节点
    }

    /**
     * 处理员工离职事件
     * 后续：回收该员工的系统权限，释放账号许可
     */
    public void onEmployeeResigned(Long employeeId, String resignDate) {
        log.info("[Approval] 收到员工离职通知: employeeId={}, resignDate={}",
                employeeId, resignDate);
        // TODO: 调用 IAM/SSO 接口回收权限，释放许可
    }
}