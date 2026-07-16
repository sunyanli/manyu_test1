package com.example.orgmgmt.service;

import com.example.orgmgmt.common.PageResult;
import com.example.orgmgmt.dto.*;
import com.example.orgmgmt.entity.Employee;

import java.util.List;

/**
 * 员工服务接口
 */
public interface EmployeeService {

    /**
     * 分页查询员工
     */
    PageResult<EmployeeVO> query(EmployeeQueryRequest req);

    /**
     * 获取员工详情
     */
    EmployeeVO getById(Long id);

    /**
     * 新增员工
     */
    Employee create(EmployeeCreateRequest req);

    /**
     * 编辑员工
     */
    Employee update(Long id, EmployeeUpdateRequest req);

    /**
     * 唯一性校验
     */
    CheckResult check(String field, String value);

    /**
     * 人员调动
     */
    void transfer(Long id, TransferRequest req);

    /**
     * 办理离职
     */
    void resign(Long id, ResignRequest req);

    /**
     * 复职
     */
    void reinstate(Long id, ReinstateRequest req);

    /**
     * 获取调动历史
     */
    List<TransferRecordVO> getTransferHistory(Long id);
}