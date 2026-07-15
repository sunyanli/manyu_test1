# 组织架构管理模块 实施计划 (testdj-201)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建组织架构管理模块，支持部门树形结构 CRUD 与懒加载、部门拖拽移动、员工新增及工号/手机号唯一性校验，为审批、权限等业务系统提供人员数据源。

**Architecture:** 采用经典三层架构 (Controller → Service → Mapper/Repository)，Spring Boot 2.7.x + MyBatis-Plus 3.5.x + MySQL 8.0。部门树通过递归查询 `parent_id` 组装，前端懒加载按需请求子节点；拖拽通过 PUT 更新父节点 ID 实现。员工唯一性校验依赖数据库唯一索引 + 应用层实时检查接口。

**Tech Stack:** Java 11, Spring Boot 2.7.x, MyBatis-Plus 3.5.x, MySQL 8.0, JUnit 5 + Mockito, Maven

---

## Global Constraints

- 所有 API 返回统一响应体 `{ "code": 200, "data": ... }`，错误时 `code` 为非 200 且 `data` 为 `null`。
- 工号 (`employee_no`) 和手机号 (`phone`) 全局唯一，数据库唯一索引 + 应用层双重保障。
- 部门树支持懒加载：GET `/api/departments/tree` 默认只返回第一级，`?parentId=X` 返回指定节点的子部门。
- 部门移动：PUT `/api/departments/{id}/move` 校验 `newParentId` 合法性，禁止将节点移动到自己或子孙节点下。
- 员工新增：必须先通过唯一性校验 (`GET /api/employees/check`)，再提交新增 (`POST /api/employees`)。

---

## File Structure

```
src/main/java/com/example/organization/
├── entity/
│   ├── Department.java          — 部门实体，映射 t_department 表
│   └── Employee.java            — 员工实体，映射 t_employee 表
├── mapper/
│   ├── DepartmentMapper.java    — 部门 Mapper 接口
│   └── EmployeeMapper.java      — 员工 Mapper 接口
├── service/
│   ├── DepartmentService.java   — 部门服务接口
│   ├── EmployeeService.java     — 员工服务接口
│   └── impl/
│       ├── DepartmentServiceImpl.java
│       └── EmployeeServiceImpl.java
├── controller/
│   ├── DepartmentController.java
│   └── EmployeeController.java
├── dto/
│   ├── DepartmentTreeNode.java     — 部门树节点 DTO
│   ├── DepartmentMoveRequest.java  — 部门移动请求 DTO
│   ├── EmployeeCreateRequest.java  — 员工新增请求 DTO
│   └── ExistenceCheckResponse.java — 唯一性校验响应 DTO
└── common/
    └── Result.java                 — 统一响应体

src/main/resources/
├── mapper/
│   ├── DepartmentMapper.xml
│   └── EmployeeMapper.xml
├── db/
│   └── schema.sql                  — 初始化 DDL
└── application.yml

src/test/java/com/example/organization/
├── service/
│   ├── DepartmentServiceTest.java
│   └── EmployeeServiceTest.java
└── controller/
    ├── DepartmentControllerTest.java
    └── EmployeeControllerTest.java
```

---

## Task 1: 数据库 Schema 与实体层

**Files:**
- Create: `src/main/resources/db/schema.sql`
- Create: `src/main/java/com/example/organization/entity/Department.java`
- Create: `src/main/java/com/example/organization/entity/Employee.java`
- Create: `src/main/java/com/example/organization/common/Result.java`

**Interfaces:**
- Consumes: (无 — 第一个任务)
- Produces:
  - `Department` 实体: `id`, `name`, `parentId`, `sortOrder`, `createdAt`, `updatedAt`
  - `Employee` 实体: `id`, `name`, `employeeNo`, `phone`, `deptId`, `position`, `status` (1=在职, 0=离职), `createdAt`, `updatedAt`
  - `Result<T>`: `code`, `data`, `message` 三个字段，静态工厂方法 `Result.ok(T data)` / `Result.fail(int code, String message)`

**Steps:**

- [ ] **Step 1: 编写 DDL**
  创建 `src/main/resources/db/schema.sql`：
  ```sql
  CREATE TABLE IF NOT EXISTS t_department (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL COMMENT '部门名称',
      parent_id BIGINT DEFAULT 0 COMMENT '父部门ID，0表示根节点',
      sort_order INT DEFAULT 0 COMMENT '排序字段',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_parent_id (parent_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='部门表';

  CREATE TABLE IF NOT EXISTS t_employee (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(50) NOT NULL COMMENT '姓名',
      employee_no VARCHAR(20) NOT NULL COMMENT '工号',
      phone VARCHAR(20) NOT NULL COMMENT '手机号',
      dept_id BIGINT NOT NULL COMMENT '所属部门ID',
      position VARCHAR(50) DEFAULT '' COMMENT '职位',
      status TINYINT DEFAULT 1 COMMENT '状态: 1=在职, 0=离职',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_employee_no (employee_no),
      UNIQUE KEY uk_phone (phone),
      INDEX idx_dept_id (dept_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='员工表';
  ```

- [ ] **Step 2: 编写 Result 统一响应体**
  创建 `src/main/java/com/example/organization/common/Result.java`：
  ```java
  package com.example.organization.common;

  public class Result<T> {
      private int code;
      private T data;
      private String message;

      private Result() {}

      public static <T> Result<T> ok(T data) {
          Result<T> r = new Result<>();
          r.code = 200;
          r.data = data;
          r.message = "success";
          return r;
      }

      public static <T> Result<T> fail(int code, String message) {
          Result<T> r = new Result<>();
          r.code = code;
          r.data = null;
          r.message = message;
          return r;
      }

      // getters & setters
      public int getCode() { return code; }
      public void setCode(int code) { this.code = code; }
      public T getData() { return data; }
      public void setData(T data) { this.data = data; }
      public String getMessage() { return message; }
      public void setMessage(String message) { this.message = message; }
  }
  ```

- [ ] **Step 3: 编写 Department 实体**
  创建 `src/main/java/com/example/organization/entity/Department.java`：
  ```java
  package com.example.organization.entity;

  import com.baomidou.mybatisplus.annotation.*;
  import java.time.LocalDateTime;

  @TableName("t_department")
  public class Department {
      @TableId(type = IdType.AUTO)
      private Long id;
      private String name;
      private Long parentId;
      private Integer sortOrder;
      @TableField(fill = FieldFill.INSERT)
      private LocalDateTime createdAt;
      @TableField(fill = FieldFill.INSERT_UPDATE)
      private LocalDateTime updatedAt;

      // getters & setters
      public Long getId() { return id; }
      public void setId(Long id) { this.id = id; }
      public String getName() { return name; }
      public void setName(String name) { this.name = name; }
      public Long getParentId() { return parentId; }
      public void setParentId(Long parentId) { this.parentId = parentId; }
      public Integer getSortOrder() { return sortOrder; }
      public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
      public LocalDateTime getCreatedAt() { return createdAt; }
      public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
      public LocalDateTime getUpdatedAt() { return updatedAt; }
      public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
  }
  ```

- [ ] **Step 4: 编写 Employee 实体**
  创建 `src/main/java/com/example/organization/entity/Employee.java`：
  ```java
  package com.example.organization.entity;

  import com.baomidou.mybatisplus.annotation.*;
  import java.time.LocalDateTime;

  @TableName("t_employee")
  public class Employee {
      @TableId(type = IdType.AUTO)
      private Long id;
      private String name;
      private String employeeNo;
      private String phone;
      private Long deptId;
      private String position;
      private Integer status; // 1=在职, 0=离职
      @TableField(fill = FieldFill.INSERT)
      private LocalDateTime createdAt;
      @TableField(fill = FieldFill.INSERT_UPDATE)
      private LocalDateTime updatedAt;

      // getters & setters
      public Long getId() { return id; }
      public void setId(Long id) { this.id = id; }
      public String getName() { return name; }
      public void setName(String name) { this.name = name; }
      public String getEmployeeNo() { return employeeNo; }
      public void setEmployeeNo(String employeeNo) { this.employeeNo = employeeNo; }
      public String getPhone() { return phone; }
      public void setPhone(String phone) { this.phone = phone; }
      public Long getDeptId() { return deptId; }
      public void setDeptId(Long deptId) { this.deptId = deptId; }
      public String getPosition() { return position; }
      public void setPosition(String position) { this.position = position; }
      public Integer getStatus() { return status; }
      public void setStatus(Integer status) { this.status = status; }
      public LocalDateTime getCreatedAt() { return createdAt; }
      public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
      public LocalDateTime getUpdatedAt() { return updatedAt; }
      public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
  }
  ```

- [ ] **Step 5: 运行测试验证实体映射**
  ```bash
  mvn test -pl . -Dtest="com.example.organization.entity.*" -DfailIfNoTests=false
  ```
  预期：编译通过，无测试失败（实体层暂不需要单元测试，此步仅验证编译）。

---

## Task 2: 部门树查询 — Mapper 与 Service

**Files:**
- Create: `src/main/java/com/example/organization/mapper/DepartmentMapper.java`
- Create: `src/main/resources/mapper/DepartmentMapper.xml`
- Create: `src/main/java/com/example/organization/dto/DepartmentTreeNode.java`
- Create: `src/main/java/com/example/organization/service/DepartmentService.java`
- Create: `src/main/java/com/example/organization/service/impl/DepartmentServiceImpl.java`
- Create: `src/test/java/com/example/organization/service/DepartmentServiceTest.java`

**Interfaces:**
- Consumes: `Department` 实体, `Result<T>` 通用响应体 (Task 1)
- Produces:
  - `DepartmentMapper.selectByParentId(Long parentId): List<Department>` — 查询指定父节点下的子部门
  - `DepartmentMapper.selectAll(): List<Department>` — 全量查询，用于内存组装树
  - `DepartmentService.buildTree(Long parentId): List<DepartmentTreeNode>` — 递归构建树
  - `DepartmentService.getChildren(Long parentId): List<DepartmentTreeNode>` — 懒加载子节点（不递归）

**Steps:**

- [ ] **Step 1: 编写 DepartmentMapper 接口**
  创建 `src/main/java/com/example/organization/mapper/DepartmentMapper.java`：
  ```java
  package com.example.organization.mapper;

  import com.baomidou.mybatisplus.core.mapper.BaseMapper;
  import com.example.organization.entity.Department;
  import org.apache.ibatis.annotations.Mapper;
  import org.apache.ibatis.annotations.Param;
  import java.util.List;

  @Mapper
  public interface DepartmentMapper extends BaseMapper<Department> {
      List<Department> selectByParentId(@Param("parentId") Long parentId);
      List<Department> selectAll();
  }
  ```

- [ ] **Step 2: 编写 DepartmentMapper.xml**
  创建 `src/main/resources/mapper/DepartmentMapper.xml`：
  ```xml
  <?xml version="1.0" encoding="UTF-8"?>
  <!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"
    "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
  <mapper namespace="com.example.organization.mapper.DepartmentMapper">
      <select id="selectByParentId" resultType="com.example.organization.entity.Department">
          SELECT id, name, parent_id, sort_order, created_at, updated_at
          FROM t_department
          WHERE parent_id = #{parentId}
          ORDER BY sort_order ASC, id ASC
      </select>

      <select id="selectAll" resultType="com.example.organization.entity.Department">
          SELECT id, name, parent_id, sort_order, created_at, updated_at
          FROM t_department
          ORDER BY sort_order ASC, id ASC
      </select>
  </mapper>
  ```

- [ ] **Step 3: 编写 DepartmentTreeNode DTO**
  创建 `src/main/java/com/example/organization/dto/DepartmentTreeNode.java`：
  ```java
  package com.example.organization.dto;

  import java.util.ArrayList;
  import java.util.List;

  public class DepartmentTreeNode {
      private Long id;
      private String name;
      private List<DepartmentTreeNode> children = new ArrayList<>();

      public DepartmentTreeNode() {}

      public DepartmentTreeNode(Long id, String name) {
          this.id = id;
          this.name = name;
      }

      public Long getId() { return id; }
      public void setId(Long id) { this.id = id; }
      public String getName() { return name; }
      public void setName(String name) { this.name = name; }
      public List<DepartmentTreeNode> getChildren() { return children; }
      public void setChildren(List<DepartmentTreeNode> children) { this.children = children; }
  }
  ```

- [ ] **Step 4: 编写 DepartmentService 接口与实现**
  创建 `src/main/java/com/example/organization/service/DepartmentService.java`：
  ```java
  package com.example.organization.service;

  import com.example.organization.dto.DepartmentTreeNode;
  import java.util.List;

  public interface DepartmentService {
      List<DepartmentTreeNode> getTree();
      List<DepartmentTreeNode> getChildren(Long parentId);
      void moveDepartment(Long id, Long newParentId);
  }
  ```

  创建 `src/main/java/com/example/organization/service/impl/DepartmentServiceImpl.java`：
  ```java
  package com.example.organization.service.impl;

  import com.example.organization.dto.DepartmentTreeNode;
  import com.example.organization.entity.Department;
  import com.example.organization.mapper.DepartmentMapper;
  import com.example.organization.service.DepartmentService;
  import org.springframework.stereotype.Service;
  import java.util.*;
  import java.util.stream.Collectors;

  @Service
  public class DepartmentServiceImpl implements DepartmentService {

      private final DepartmentMapper departmentMapper;

      public DepartmentServiceImpl(DepartmentMapper departmentMapper) {
          this.departmentMapper = departmentMapper;
      }

      @Override
      public List<DepartmentTreeNode> getTree() {
          List<Department> all = departmentMapper.selectAll();
          Map<Long, List<Department>> parentMap = all.stream()
              .collect(Collectors.groupingBy(Department::getParentId));
          return buildChildren(0L, parentMap);
      }

      @Override
      public List<DepartmentTreeNode> getChildren(Long parentId) {
          List<Department> children = departmentMapper.selectByParentId(parentId);
          return children.stream()
              .map(d -> new DepartmentTreeNode(d.getId(), d.getName()))
              .collect(Collectors.toList());
      }

      @Override
      public void moveDepartment(Long id, Long newParentId) {
          // 待 Task 3 实现
      }

      private List<DepartmentTreeNode> buildChildren(Long parentId, Map<Long, List<Department>> parentMap) {
          List<Department> children = parentMap.getOrDefault(parentId, Collections.emptyList());
          List<DepartmentTreeNode> nodes = new ArrayList<>();
          for (Department d : children) {
              DepartmentTreeNode node = new DepartmentTreeNode(d.getId(), d.getName());
              node.setChildren(buildChildren(d.getId(), parentMap));
              nodes.add(node);
          }
          return nodes;
      }
  }
  ```

- [ ] **Step 5: 编写 DepartmentService 测试**
  创建 `src/test/java/com/example/organization/service/DepartmentServiceTest.java`：
  ```java
  package com.example.organization.service;

  import com.example.organization.dto.DepartmentTreeNode;
  import com.example.organization.entity.Department;
  import com.example.organization.mapper.DepartmentMapper;
  import com.example.organization.service.impl.DepartmentServiceImpl;
  import org.junit.jupiter.api.BeforeEach;
  import org.junit.jupiter.api.Test;
  import org.junit.jupiter.api.extension.ExtendWith;
  import org.mockito.Mock;
  import org.mockito.junit.jupiter.MockitoExtension;
  import java.util.Arrays;
  import java.util.List;
  import static org.junit.jupiter.api.Assertions.*;
  import static org.mockito.Mockito.when;

  @ExtendWith(MockitoExtension.class)
  class DepartmentServiceTest {

      @Mock
      private DepartmentMapper departmentMapper;

      private DepartmentServiceImpl departmentService;

      @BeforeEach
      void setUp() {
          departmentService = new DepartmentServiceImpl(departmentMapper);
      }

      @Test
      void getTree_shouldReturnFullTree() {
          Department root = dept(1L, "研发部", 0L);
          Department child = dept(2L, "前端组", 1L);
          Department child2 = dept(3L, "后端组", 1L);
          when(departmentMapper.selectAll()).thenReturn(Arrays.asList(root, child, child2));

          List<DepartmentTreeNode> tree = departmentService.getTree();

          assertEquals(1, tree.size());
          assertEquals("研发部", tree.get(0).getName());
          assertEquals(2, tree.get(0).getChildren().size());
          assertEquals("前端组", tree.get(0).getChildren().get(0).getName());
          assertEquals("后端组", tree.get(0).getChildren().get(1).getName());
      }

      @Test
      void getChildren_shouldReturnDirectChildren() {
          Department child = dept(2L, "前端组", 1L);
          when(departmentMapper.selectByParentId(1L)).thenReturn(Arrays.asList(child));

          List<DepartmentTreeNode> children = departmentService.getChildren(1L);

          assertEquals(1, children.size());
          assertEquals("前端组", children.get(0).getName());
          assertTrue(children.get(0).getChildren().isEmpty());
      }

      @Test
      void getTree_emptyDatabase_shouldReturnEmptyList() {
          when(departmentMapper.selectAll()).thenReturn(Arrays.asList());
          List<DepartmentTreeNode> tree = departmentService.getTree();
          assertTrue(tree.isEmpty());
      }

      private Department dept(Long id, String name, Long parentId) {
          Department d = new Department();
          d.setId(id);
          d.setName(name);
          d.setParentId(parentId);
          return d;
      }
  }
  ```

- [ ] **Step 6: 运行测试**
  ```bash
  mvn test -Dtest="com.example.organization.service.DepartmentServiceTest"
  ```
  预期：3 个测试全部通过。

---

## Task 3: 部门移动 — Service 层校验逻辑

**Files:**
- Modify: `src/main/java/com/example/organization/service/impl/DepartmentServiceImpl.java` (实现 `moveDepartment`)
- Create: `src/main/java/com/example/organization/dto/DepartmentMoveRequest.java`

**Interfaces:**
- Consumes: `DepartmentMapper` (Task 2), `Department` 实体 (Task 1)
- Produces: `moveDepartment(Long id, Long newParentId)` — 校验 + 更新父节点

**Steps:**

- [ ] **Step 1: 编写 DepartmentMoveRequest DTO**
  创建 `src/main/java/com/example/organization/dto/DepartmentMoveRequest.java`：
  ```java
  package com.example.organization.dto;

  import javax.validation.constraints.NotNull;

  public class DepartmentMoveRequest {
      @NotNull
      private Long newParentId;

      public Long getNewParentId() { return newParentId; }
      public void setNewParentId(Long newParentId) { this.newParentId = newParentId; }
  }
  ```

- [ ] **Step 2: 在 DepartmentServiceImpl 中实现 moveDepartment**
  修改 `src/main/java/com/example/organization/service/impl/DepartmentServiceImpl.java`，将 `moveDepartment` 方法体替换为：
  ```java
  @Override
  @Transactional
  public void moveDepartment(Long id, Long newParentId) {
      if (id.equals(newParentId)) {
          throw new IllegalArgumentException("不能将部门移动到自己下面");
      }
      Department dept = departmentMapper.selectById(id);
      if (dept == null) {
          throw new IllegalArgumentException("部门不存在: " + id);
      }
      if (newParentId != 0L) {
          Department newParent = departmentMapper.selectById(newParentId);
          if (newParent == null) {
              throw new IllegalArgumentException("目标父部门不存在: " + newParentId);
          }
      }
      // 检查 newParentId 是否是 id 的子孙节点（防止循环引用）
      List<Long> descendantIds = collectDescendantIds(id);
      if (descendantIds.contains(newParentId)) {
          throw new IllegalArgumentException("不能将部门移动到其子部门下");
      }
      dept.setParentId(newParentId);
      departmentMapper.updateById(dept);
  }

  private List<Long> collectDescendantIds(Long deptId) {
      List<Long> ids = new ArrayList<>();
      List<Department> children = departmentMapper.selectByParentId(deptId);
      for (Department child : children) {
          ids.add(child.getId());
          ids.addAll(collectDescendantIds(child.getId()));
      }
      return ids;
  }
  ```
  在文件头部添加 import：
  ```java
  import org.springframework.transaction.annotation.Transactional;
  import java.util.ArrayList;
  ```

- [ ] **Step 3: 为 moveDepartment 编写测试**
  在 `src/test/java/com/example/organization/service/DepartmentServiceTest.java` 末尾追加：
  ```java
  @Test
  void moveDepartment_shouldUpdateParentId() {
      Department dept = dept(2L, "前端组", 1L);
      when(departmentMapper.selectById(2L)).thenReturn(dept);
      when(departmentMapper.selectById(5L)).thenReturn(dept(5L, "研发二部", 0L));
      when(departmentMapper.selectByParentId(2L)).thenReturn(Arrays.asList());
      when(departmentMapper.updateById(dept)).thenReturn(1);

      assertDoesNotThrow(() -> departmentService.moveDepartment(2L, 5L));
      assertEquals(5L, dept.getParentId());
  }

  @Test
  void moveDepartment_selfAsParent_shouldThrow() {
      assertThrows(IllegalArgumentException.class,
          () -> departmentService.moveDepartment(1L, 1L));
  }

  @Test
  void moveDepartment_toDescendant_shouldThrow() {
      Department dept = dept(1L, "研发部", 0L);
      Department child = dept(2L, "前端组", 1L);
      when(departmentMapper.selectById(1L)).thenReturn(dept);
      when(departmentMapper.selectById(2L)).thenReturn(child);
      when(departmentMapper.selectByParentId(1L)).thenReturn(Arrays.asList(child));
      when(departmentMapper.selectByParentId(2L)).thenReturn(Arrays.asList());

      assertThrows(IllegalArgumentException.class,
          () -> departmentService.moveDepartment(1L, 2L));
  }

  @Test
  void moveDepartment_deptNotFound_shouldThrow() {
      when(departmentMapper.selectById(999L)).thenReturn(null);
      assertThrows(IllegalArgumentException.class,
          () -> departmentService.moveDepartment(999L, 0L));
  }
  ```

- [ ] **Step 4: 运行测试**
  ```bash
  mvn test -Dtest="com.example.organization.service.DepartmentServiceTest"
  ```
  预期：7 个测试全部通过（3 个旧 + 4 个新）。

---

## Task 4: 部门 Controller — Tree 与 Move API

**Files:**
- Create: `src/main/java/com/example/organization/controller/DepartmentController.java`
- Create: `src/test/java/com/example/organization/controller/DepartmentControllerTest.java`

**Interfaces:**
- Consumes: `DepartmentService` (Task 2-3), `Result<T>` (Task 1), `DepartmentMoveRequest` (Task 3)
- Produces:
  - `GET /api/departments/tree` → `Result<List<DepartmentTreeNode>>`
  - `GET /api/departments/tree?parentId={id}` → 懒加载子节点
  - `PUT /api/departments/{id}/move` → 移动部门

**Steps:**

- [ ] **Step 1: 编写 DepartmentController**
  创建 `src/main/java/com/example/organization/controller/DepartmentController.java`：
  ```java
  package com.example.organization.controller;

  import com.example.organization.common.Result;
  import com.example.organization.dto.DepartmentMoveRequest;
  import com.example.organization.dto.DepartmentTreeNode;
  import com.example.organization.service.DepartmentService;
  import org.springframework.web.bind.annotation.*;
  import javax.validation.Valid;
  import java.util.List;

  @RestController
  @RequestMapping("/api/departments")
  public class DepartmentController {

      private final DepartmentService departmentService;

      public DepartmentController(DepartmentService departmentService) {
          this.departmentService = departmentService;
      }

      @GetMapping("/tree")
      public Result<List<DepartmentTreeNode>> getTree(
              @RequestParam(value = "parentId", required = false) Long parentId) {
          if (parentId != null) {
              return Result.ok(departmentService.getChildren(parentId));
          }
          return Result.ok(departmentService.getTree());
      }

      @PutMapping("/{id}/move")
      public Result<Void> moveDepartment(
              @PathVariable Long id,
              @Valid @RequestBody DepartmentMoveRequest request) {
          departmentService.moveDepartment(id, request.getNewParentId());
          return Result.ok(null);
      }
  }
  ```

- [ ] **Step 2: 编写 DepartmentController 测试**
  创建 `src/test/java/com/example/organization/controller/DepartmentControllerTest.java`：
  ```java
  package com.example.organization.controller;

  import com.example.organization.common.Result;
  import com.example.organization.dto.DepartmentMoveRequest;
  import com.example.organization.dto.DepartmentTreeNode;
  import com.example.organization.service.DepartmentService;
  import org.junit.jupiter.api.Test;
  import org.springframework.beans.factory.annotation.Autowired;
  import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
  import org.springframework.boot.test.mock.mockito.MockBean;
  import org.springframework.http.MediaType;
  import org.springframework.test.web.servlet.MockMvc;
  import java.util.Arrays;
  import static org.mockito.ArgumentMatchers.anyLong;
  import static org.mockito.Mockito.*;
  import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
  import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

  @WebMvcTest(DepartmentController.class)
  class DepartmentControllerTest {

      @Autowired
      private MockMvc mockMvc;

      @MockBean
      private DepartmentService departmentService;

      @Test
      void getTree_noParentId_shouldReturnFullTree() throws Exception {
          DepartmentTreeNode root = new DepartmentTreeNode(1L, "研发部");
          root.setChildren(Arrays.asList(new DepartmentTreeNode(2L, "前端组")));
          when(departmentService.getTree()).thenReturn(Arrays.asList(root));

          mockMvc.perform(get("/api/departments/tree"))
              .andExpect(status().isOk())
              .andExpect(jsonPath("$.code").value(200))
              .andExpect(jsonPath("$.data[0].name").value("研发部"))
              .andExpect(jsonPath("$.data[0].children[0].name").value("前端组"));
      }

      @Test
      void getTree_withParentId_shouldReturnChildren() throws Exception {
          DepartmentTreeNode child = new DepartmentTreeNode(2L, "前端组");
          when(departmentService.getChildren(1L)).thenReturn(Arrays.asList(child));

          mockMvc.perform(get("/api/departments/tree?parentId=1"))
              .andExpect(status().isOk())
              .andExpect(jsonPath("$.code").value(200))
              .andExpect(jsonPath("$.data[0].name").value("前端组"));
      }

      @Test
      void moveDepartment_shouldReturnOk() throws Exception {
          doNothing().when(departmentService).moveDepartment(anyLong(), anyLong());

          mockMvc.perform(put("/api/departments/2/move")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"newParentId\":5}"))
              .andExpect(status().isOk())
              .andExpect(jsonPath("$.code").value(200));
      }
  }
  ```

- [ ] **Step 3: 运行测试**
  ```bash
  mvn test -Dtest="com.example.organization.controller.DepartmentControllerTest"
  ```
  预期：3 个测试全部通过。

---

## Task 5: 员工唯一性校验 — Mapper 与 Service

**Files:**
- Create: `src/main/java/com/example/organization/mapper/EmployeeMapper.java`
- Create: `src/main/resources/mapper/EmployeeMapper.xml`
- Create: `src/main/java/com/example/organization/dto/ExistenceCheckResponse.java`
- Create: `src/main/java/com/example/organization/service/EmployeeService.java`
- Create: `src/main/java/com/example/organization/service/impl/EmployeeServiceImpl.java`
- Create: `src/test/java/com/example/organization/service/EmployeeServiceTest.java`

**Interfaces:**
- Consumes: `Employee` 实体, `Result<T>` (Task 1), `DepartmentMapper` (Task 2)
- Produces:
  - `EmployeeMapper.countByEmployeeNo(String employeeNo): int`
  - `EmployeeMapper.countByPhone(String phone): int`
  - `EmployeeMapper.insert(Employee employee): int`
  - `EmployeeService.checkExists(String field, String value): boolean` — field 为 "employeeNo" 或 "phone"
  - `EmployeeService.create(EmployeeCreateRequest request): Employee`

**Steps:**

- [ ] **Step 1: 编写 EmployeeMapper 接口与 XML**
  创建 `src/main/java/com/example/organization/mapper/EmployeeMapper.java`：
  ```java
  package com.example.organization.mapper;

  import com.baomidou.mybatisplus.core.mapper.BaseMapper;
  import com.example.organization.entity.Employee;
  import org.apache.ibatis.annotations.Mapper;
  import org.apache.ibatis.annotations.Param;

  @Mapper
  public interface EmployeeMapper extends BaseMapper<Employee> {
      int countByEmployeeNo(@Param("employeeNo") String employeeNo);
      int countByPhone(@Param("phone") String phone);
  }
  ```

  创建 `src/main/resources/mapper/EmployeeMapper.xml`：
  ```xml
  <?xml version="1.0" encoding="UTF-8"?>
  <!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"
    "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
  <mapper namespace="com.example.organization.mapper.EmployeeMapper">
      <select id="countByEmployeeNo" resultType="int">
          SELECT COUNT(*) FROM t_employee WHERE employee_no = #{employeeNo}
      </select>
      <select id="countByPhone" resultType="int">
          SELECT COUNT(*) FROM t_employee WHERE phone = #{phone}
      </select>
  </mapper>
  ```

- [ ] **Step 2: 编写 ExistenceCheckResponse DTO**
  创建 `src/main/java/com/example/organization/dto/ExistenceCheckResponse.java`：
  ```java
  package com.example.organization.dto;

  public class ExistenceCheckResponse {
      private boolean isExist;

      public ExistenceCheckResponse() {}

      public ExistenceCheckResponse(boolean isExist) {
          this.isExist = isExist;
      }

      public boolean getIsExist() { return isExist; }
      public void setIsExist(boolean isExist) { this.isExist = isExist; }
  }
  ```

- [ ] **Step 3: 编写 EmployeeCreateRequest DTO**
  创建 `src/main/java/com/example/organization/dto/EmployeeCreateRequest.java`：
  ```java
  package com.example.organization.dto;

  import javax.validation.constraints.NotBlank;
  import javax.validation.constraints.NotNull;

  public class EmployeeCreateRequest {
      @NotBlank
      private String name;
      @NotBlank
      private String employeeNo;
      @NotNull
      private Long deptId;
      @NotBlank
      private String phone;
      private String position;

      public String getName() { return name; }
      public void setName(String name) { this.name = name; }
      public String getEmployeeNo() { return employeeNo; }
      public void setEmployeeNo(String employeeNo) { this.employeeNo = employeeNo; }
      public Long getDeptId() { return deptId; }
      public void setDeptId(Long deptId) { this.deptId = deptId; }
      public String getPhone() { return phone; }
      public void setPhone(String phone) { this.phone = phone; }
      public String getPosition() { return position; }
      public void setPosition(String position) { this.position = position; }
  }
  ```

- [ ] **Step 4: 编写 EmployeeService 接口与实现**
  创建 `src/main/java/com/example/organization/service/EmployeeService.java`：
  ```java
  package com.example.organization.service;

  import com.example.organization.dto.EmployeeCreateRequest;
  import com.example.organization.entity.Employee;

  public interface EmployeeService {
      boolean checkExists(String field, String value);
      Employee create(EmployeeCreateRequest request);
  }
  ```

  创建 `src/main/java/com/example/organization/service/impl/EmployeeServiceImpl.java`：
  ```java
  package com.example.organization.service.impl;

  import com.example.organization.dto.EmployeeCreateRequest;
  import com.example.organization.entity.Employee;
  import com.example.organization.mapper.DepartmentMapper;
  import com.example.organization.mapper.EmployeeMapper;
  import com.example.organization.service.EmployeeService;
  import org.springframework.stereotype.Service;
  import org.springframework.transaction.annotation.Transactional;

  @Service
  public class EmployeeServiceImpl implements EmployeeService {

      private final EmployeeMapper employeeMapper;
      private final DepartmentMapper departmentMapper;

      public EmployeeServiceImpl(EmployeeMapper employeeMapper, DepartmentMapper departmentMapper) {
          this.employeeMapper = employeeMapper;
          this.departmentMapper = departmentMapper;
      }

      @Override
      public boolean checkExists(String field, String value) {
          if ("employeeNo".equals(field)) {
              return employeeMapper.countByEmployeeNo(value) > 0;
          }
          if ("phone".equals(field)) {
              return employeeMapper.countByPhone(value) > 0;
          }
          throw new IllegalArgumentException("不支持的校验字段: " + field);
      }

      @Override
      @Transactional
      public Employee create(EmployeeCreateRequest request) {
          // 校验部门存在
          if (departmentMapper.selectById(request.getDeptId()) == null) {
              throw new IllegalArgumentException("部门不存在: " + request.getDeptId());
          }
          // 校验唯一性
          if (employeeMapper.countByEmployeeNo(request.getEmployeeNo()) > 0) {
              throw new IllegalArgumentException("工号已存在: " + request.getEmployeeNo());
          }
          if (employeeMapper.countByPhone(request.getPhone()) > 0) {
              throw new IllegalArgumentException("手机号已存在: " + request.getPhone());
          }
          Employee employee = new Employee();
          employee.setName(request.getName());
          employee.setEmployeeNo(request.getEmployeeNo());
          employee.setPhone(request.getPhone());
          employee.setDeptId(request.getDeptId());
          employee.setPosition(request.getPosition() != null ? request.getPosition() : "");
          employee.setStatus(1);
          employeeMapper.insert(employee);
          return employee;
      }
  }
  ```

- [ ] **Step 5: 编写 EmployeeService 测试**
  创建 `src/test/java/com/example/organization/service/EmployeeServiceTest.java`：
  ```java
  package com.example.organization.service;

  import com.example.organization.dto.EmployeeCreateRequest;
  import com.example.organization.entity.Department;
  import com.example.organization.entity.Employee;
  import com.example.organization.mapper.DepartmentMapper;
  import com.example.organization.mapper.EmployeeMapper;
  import com.example.organization.service.impl.EmployeeServiceImpl;
  import org.junit.jupiter.api.BeforeEach;
  import org.junit.jupiter.api.Test;
  import org.junit.jupiter.api.extension.ExtendWith;
  import org.mockito.ArgumentCaptor;
  import org.mockito.Mock;
  import org.mockito.junit.jupiter.MockitoExtension;
  import static org.junit.jupiter.api.Assertions.*;
  import static org.mockito.ArgumentMatchers.any;
  import static org.mockito.Mockito.*;

  @ExtendWith(MockitoExtension.class)
  class EmployeeServiceTest {

      @Mock
      private EmployeeMapper employeeMapper;

      @Mock
      private DepartmentMapper departmentMapper;

      private EmployeeServiceImpl employeeService;

      @BeforeEach
      void setUp() {
          employeeService = new EmployeeServiceImpl(employeeMapper, departmentMapper);
      }

      @Test
      void checkExists_employeeNo_shouldReturnTrue() {
          when(employeeMapper.countByEmployeeNo("10086")).thenReturn(1);
          assertTrue(employeeService.checkExists("employeeNo", "10086"));
      }

      @Test
      void checkExists_employeeNo_shouldReturnFalse() {
          when(employeeMapper.countByEmployeeNo("10086")).thenReturn(0);
          assertFalse(employeeService.checkExists("employeeNo", "10086"));
      }

      @Test
      void checkExists_phone_shouldReturnTrue() {
          when(employeeMapper.countByPhone("13800138000")).thenReturn(1);
          assertTrue(employeeService.checkExists("phone", "13800138000"));
      }

      @Test
      void checkExists_invalidField_shouldThrow() {
          assertThrows(IllegalArgumentException.class,
              () -> employeeService.checkExists("invalid", "val"));
      }

      @Test
      void create_validRequest_shouldSucceed() {
          EmployeeCreateRequest req = buildRequest("张三", "10086", "13800138000", 2L);
          when(departmentMapper.selectById(2L)).thenReturn(new Department());
          when(employeeMapper.countByEmployeeNo("10086")).thenReturn(0);
          when(employeeMapper.countByPhone("13800138000")).thenReturn(0);
          when(employeeMapper.insert(any(Employee.class))).thenReturn(1);

          Employee result = employeeService.create(req);

          assertNotNull(result);
          assertEquals("张三", result.getName());
          assertEquals("10086", result.getEmployeeNo());
          assertEquals(1, result.getStatus());
      }

      @Test
      void create_deptNotExist_shouldThrow() {
          EmployeeCreateRequest req = buildRequest("张三", "10086", "13800138000", 999L);
          when(departmentMapper.selectById(999L)).thenReturn(null);

          assertThrows(IllegalArgumentException.class,
              () -> employeeService.create(req));
      }

      @Test
      void create_duplicateEmployeeNo_shouldThrow() {
          EmployeeCreateRequest req = buildRequest("张三", "10086", "13800138000", 2L);
          when(departmentMapper.selectById(2L)).thenReturn(new Department());
          when(employeeMapper.countByEmployeeNo("10086")).thenReturn(1);

          assertThrows(IllegalArgumentException.class,
              () -> employeeService.create(req));
      }

      @Test
      void create_duplicatePhone_shouldThrow() {
          EmployeeCreateRequest req = buildRequest("张三", "10086", "13800138000", 2L);
          when(departmentMapper.selectById(2L)).thenReturn(new Department());
          when(employeeMapper.countByEmployeeNo("10086")).thenReturn(0);
          when(employeeMapper.countByPhone("13800138000")).thenReturn(1);

          assertThrows(IllegalArgumentException.class,
              () -> employeeService.create(req));
      }

      private EmployeeCreateRequest buildRequest(String name, String no, String phone, Long deptId) {
          EmployeeCreateRequest r = new EmployeeCreateRequest();
          r.setName(name);
          r.setEmployeeNo(no);
          r.setPhone(phone);
          r.setDeptId(deptId);
          r.setPosition("工程师");
          return r;
      }
  }
  ```

- [ ] **Step 6: 运行测试**
  ```bash
  mvn test -Dtest="com.example.organization.service.EmployeeServiceTest"
  ```
  预期：8 个测试全部通过。

---

## Task 6: 员工 Controller — Check 与 Create API

**Files:**
- Create: `src/main/java/com/example/organization/controller/EmployeeController.java`
- Create: `src/test/java/com/example/organization/controller/EmployeeControllerTest.java`

**Interfaces:**
- Consumes: `EmployeeService` (Task 5), `Result<T>` (Task 1), `EmployeeCreateRequest` (Task 5), `ExistenceCheckResponse` (Task 5)
- Produces:
  - `GET /api/employees/check?field=employeeNo&value=10086` → `Result<ExistenceCheckResponse>`
  - `POST /api/employees` → `Result<Employee>`

**Steps:**

- [ ] **Step 1: 编写 EmployeeController**
  创建 `src/main/java/com/example/organization/controller/EmployeeController.java`：
  ```java
  package com.example.organization.controller;

  import com.example.organization.common.Result;
  import com.example.organization.dto.EmployeeCreateRequest;
  import com.example.organization.dto.ExistenceCheckResponse;
  import com.example.organization.entity.Employee;
  import com.example.organization.service.EmployeeService;
  import org.springframework.web.bind.annotation.*;
  import javax.validation.Valid;

  @RestController
  @RequestMapping("/api/employees")
  public class EmployeeController {

      private final EmployeeService employeeService;

      public EmployeeController(EmployeeService employeeService) {
          this.employeeService = employeeService;
      }

      @GetMapping("/check")
      public Result<ExistenceCheckResponse> check(
              @RequestParam String field,
              @RequestParam String value) {
          boolean exists = employeeService.checkExists(field, value);
          return Result.ok(new ExistenceCheckResponse(exists));
      }

      @PostMapping
      public Result<Employee> create(@Valid @RequestBody EmployeeCreateRequest request) {
          Employee employee = employeeService.create(request);
          return Result.ok(employee);
      }
  }
  ```

- [ ] **Step 2: 编写 EmployeeController 测试**
  创建 `src/test/java/com/example/organization/controller/EmployeeControllerTest.java`：
  ```java
  package com.example.organization.controller;

  import com.example.organization.entity.Employee;
  import com.example.organization.service.EmployeeService;
  import org.junit.jupiter.api.Test;
  import org.springframework.beans.factory.annotation.Autowired;
  import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
  import org.springframework.boot.test.mock.mockito.MockBean;
  import org.springframework.http.MediaType;
  import org.springframework.test.web.servlet.MockMvc;
  import static org.mockito.ArgumentMatchers.any;
  import static org.mockito.Mockito.when;
  import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
  import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

  @WebMvcTest(EmployeeController.class)
  class EmployeeControllerTest {

      @Autowired
      private MockMvc mockMvc;

      @MockBean
      private EmployeeService employeeService;

      @Test
      void check_employeeNoExists_shouldReturnTrue() throws Exception {
          when(employeeService.checkExists("employeeNo", "10086")).thenReturn(true);

          mockMvc.perform(get("/api/employees/check?field=employeeNo&value=10086"))
              .andExpect(status().isOk())
              .andExpect(jsonPath("$.code").value(200))
              .andExpect(jsonPath("$.data.isExist").value(true));
      }

      @Test
      void check_phoneNotExists_shouldReturnFalse() throws Exception {
          when(employeeService.checkExists("phone", "13800138000")).thenReturn(false);

          mockMvc.perform(get("/api/employees/check?field=phone&value=13800138000"))
              .andExpect(status().isOk())
              .andExpect(jsonPath("$.code").value(200))
              .andExpect(jsonPath("$.data.isExist").value(false));
      }

      @Test
      void create_validRequest_shouldReturnEmployee() throws Exception {
          Employee emp = new Employee();
          emp.setId(1L);
          emp.setName("张三");
          emp.setEmployeeNo("10086");
          when(employeeService.create(any())).thenReturn(emp);

          mockMvc.perform(post("/api/employees")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"name\":\"张三\",\"employeeNo\":\"10086\",\"deptId\":2,\"phone\":\"13800138000\"}"))
              .andExpect(status().isOk())
              .andExpect(jsonPath("$.code").value(200))
              .andExpect(jsonPath("$.data.name").value("张三"))
              .andExpect(jsonPath("$.data.employeeNo").value("10086"));
      }
  }
  ```

- [ ] **Step 3: 运行测试**
  ```bash
  mvn test -Dtest="com.example.organization.controller.EmployeeControllerTest"
  ```
  预期：3 个测试全部通过。

---

## Task 7: 全局异常处理与集成验证

**Files:**
- Create: `src/main/java/com/example/organization/common/GlobalExceptionHandler.java`
- Create: `src/main/resources/application.yml`

**Interfaces:**
- Consumes: `Result<T>` (Task 1)
- Produces: 全局 `@RestControllerAdvice` 将 `IllegalArgumentException` 转换为 `Result.fail(400, message)`

**Steps:**

- [ ] **Step 1: 编写全局异常处理器**
  创建 `src/main/java/com/example/organization/common/GlobalExceptionHandler.java`：
  ```java
  package com.example.organization.common;

  import org.springframework.http.HttpStatus;
  import org.springframework.web.bind.annotation.ExceptionHandler;
  import org.springframework.web.bind.annotation.ResponseStatus;
  import org.springframework.web.bind.annotation.RestControllerAdvice;

  @RestControllerAdvice
  public class GlobalExceptionHandler {

      @ExceptionHandler(IllegalArgumentException.class)
      @ResponseStatus(HttpStatus.BAD_REQUEST)
      public Result<Void> handleIllegalArgument(IllegalArgumentException ex) {
          return Result.fail(400, ex.getMessage());
      }

      @ExceptionHandler(Exception.class)
      @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
      public Result<Void> handleGeneral(Exception ex) {
          return Result.fail(500, "服务器内部错误");
      }
  }
  ```

- [ ] **Step 2: 编写 application.yml**
  创建 `src/main/resources/application.yml`：
  ```yaml
  spring:
    datasource:
      url: jdbc:mysql://localhost:3306/organization?useUnicode=true&characterEncoding=utf8mb4&serverTimezone=Asia/Shanghai
      username: root
      password: ${DB_PASSWORD:}
      driver-class-name: com.mysql.cj.jdbc.Driver
    sql:
      init:
        mode: always
        schema-locations: classpath:db/schema.sql

  mybatis-plus:
    mapper-locations: classpath:mapper/*.xml
    type-aliases-package: com.example.organization.entity
    configuration:
      map-underscore-to-camel-case: true
    global-config:
      db-config:
        id-type: auto

  server:
    port: 8080
  ```

- [ ] **Step 3: 运行全部测试**
  ```bash
  mvn test
  ```
  预期：全部测试通过（DepartmentServiceTest: 7 + DepartmentControllerTest: 3 + EmployeeServiceTest: 8 + EmployeeControllerTest: 3 = 21 个测试）。

---

## Self-Review

### 1. Spec Coverage

| 需求项 | 覆盖任务 | 说明 |
|--------|---------|------|
| 部门树加载 (GET /api/departments/tree) | Task 2, Task 4 | Service 递归构建树 + Controller 返回 |
| 懒加载子节点 (parentId 参数) | Task 2, Task 4 | `getChildren(parentId)` 不递归 |
| 拖拽移动 (PUT /api/departments/{id}/move) | Task 3, Task 4 | Service 校验 + Controller 路由 |
| 员工唯一性校验 (GET /api/employees/check) | Task 5, Task 6 | `checkExists(field, value)` |
| 员工新增 (POST /api/employees) | Task 5, Task 6 | Service 校验唯一性+部门存在 |
| 数据库唯一索引保底 | Task 1 | `uk_employee_no`, `uk_phone` |
| 统一响应体 `{code, data}` | Task 1 | `Result<T>` |

### 2. Placeholder Scan
- 无 TBD / TODO / "implement later" / "fill in details"
- 无 "add appropriate error handling" (具体异常已在 GlobalExceptionHandler 中处理)
- 无 "write tests for the above" (所有测试代码已给出)
- 无 "similar to Task N" (每个 Task 代码独立完整)

### 3. Gap Analysis
- 权限控制（超管/HR/部门主管）属于后续迭代，不在本计划范围
- 员工离职、编辑、删除等生命周期操作不在本计划范围
- 前端交互不在本后端计划范围

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-07-15-organization-management-implementation-plan.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoint review.