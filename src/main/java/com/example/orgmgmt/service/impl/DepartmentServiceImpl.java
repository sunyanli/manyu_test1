package com.example.orgmgmt.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.example.orgmgmt.common.BusinessException;
import com.example.orgmgmt.common.Constants;
import com.example.orgmgmt.dto.DepartmentCreateRequest;
import com.example.orgmgmt.dto.DepartmentDTO;
import com.example.orgmgmt.dto.DepartmentMoveRequest;
import com.example.orgmgmt.dto.DepartmentUpdateRequest;
import com.example.orgmgmt.entity.Department;
import com.example.orgmgmt.entity.Employee;
import com.example.orgmgmt.mapper.DepartmentMapper;
import com.example.orgmgmt.mapper.EmployeeMapper;
import com.example.orgmgmt.service.DepartmentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 部门服务实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DepartmentServiceImpl implements DepartmentService {

    private final DepartmentMapper departmentMapper;
    private final EmployeeMapper employeeMapper;

    @Override
    public List<DepartmentDTO> getTree() {
        // 查询所有 active 状态的部门，按 sort_order 排序
        LambdaQueryWrapper<Department> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Department::getStatus, Constants.STATUS_ACTIVE)
               .orderByAsc(Department::getSortOrder);
        List<Department> allDepts = departmentMapper.selectList(wrapper);

        if (allDepts.isEmpty()) {
            return new ArrayList<>();
        }

        // 按 parentId 分组
        Map<Long, List<Department>> parentIdMap = allDepts.stream()
                .collect(Collectors.groupingBy(
                        d -> d.getParentId() != null ? d.getParentId() : 0L));

        // 递归组装树：parentId 为 null 的是根节点
        List<DepartmentDTO> rootNodes = new ArrayList<>();
        // 先收集 parentId 为 null 的根节点
        List<Department> roots = allDepts.stream()
                .filter(d -> d.getParentId() == null)
                .collect(Collectors.toList());
        for (Department root : roots) {
            rootNodes.add(buildTree(root, parentIdMap));
        }
        return rootNodes;
    }

    private DepartmentDTO buildTree(Department dept, Map<Long, List<Department>> parentIdMap) {
        DepartmentDTO dto = convertToDTO(dept);
        List<Department> children = parentIdMap.getOrDefault(dept.getId(), new ArrayList<>());
        List<DepartmentDTO> childDTOs = new ArrayList<>();
        for (Department child : children) {
            childDTOs.add(buildTree(child, parentIdMap));
        }
        dto.setChildren(childDTOs);
        return dto;
    }

    @Override
    public List<DepartmentDTO> getChildren(Long parentId) {
        LambdaQueryWrapper<Department> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Department::getParentId, parentId)
               .eq(Department::getStatus, Constants.STATUS_ACTIVE)
               .orderByAsc(Department::getSortOrder);
        List<Department> children = departmentMapper.selectList(wrapper);

        return children.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public Department create(DepartmentCreateRequest request) {
        // 校验：若 parentId 不为 null，校验父部门存在且 active
        if (request.getParentId() != null) {
            Department parent = departmentMapper.selectById(request.getParentId());
            if (parent == null || !Constants.STATUS_ACTIVE.equals(parent.getStatus())) {
                throw new BusinessException(Constants.CODE_BAD_REQUEST, "父部门不存在或已停用");
            }
            // 校验层级深度不超过6层
            int parentDepth = countDepth(parent.getPath());
            if (parentDepth >= Constants.MAX_DEPT_DEPTH) {
                throw new BusinessException(Constants.CODE_BAD_REQUEST, "部门层级已达上限（最多" + Constants.MAX_DEPT_DEPTH + "层）");
            }
        }

        Department dept = new Department();
        dept.setName(request.getName());
        dept.setParentId(request.getParentId());
        dept.setSortOrder(request.getSortOrder() != null ? request.getSortOrder() : 0);
        dept.setManagerId(request.getManagerId());
        dept.setStatus(Constants.STATUS_ACTIVE);

        departmentMapper.insert(dept);

        // 计算 path：根节点 path = id，子节点 path = parent.path + "-" + id
        String path;
        if (dept.getParentId() == null) {
            path = String.valueOf(dept.getId());
        } else {
            Department parent = departmentMapper.selectById(dept.getParentId());
            path = parent.getPath() + "-" + dept.getId();
        }
        dept.setPath(path);
        departmentMapper.updateById(dept);

        log.info("创建部门成功: id={}, name={}, path={}", dept.getId(), dept.getName(), dept.getPath());
        return dept;
    }

    @Override
    @Transactional
    public Department update(Long id, DepartmentUpdateRequest request) {
        Department dept = departmentMapper.selectById(id);
        if (dept == null) {
            throw new BusinessException(Constants.CODE_NOT_FOUND, "部门不存在");
        }

        dept.setName(request.getName());
        if (request.getSortOrder() != null) {
            dept.setSortOrder(request.getSortOrder());
        }
        dept.setManagerId(request.getManagerId());

        departmentMapper.updateById(dept);
        log.info("更新部门成功: id={}, name={}", dept.getId(), dept.getName());
        return dept;
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Department dept = departmentMapper.selectById(id);
        if (dept == null || !Constants.STATUS_ACTIVE.equals(dept.getStatus())) {
            throw new BusinessException(Constants.CODE_NOT_FOUND, "部门不存在或已停用");
        }

        // 校验：无子部门
        LambdaQueryWrapper<Department> childWrapper = new LambdaQueryWrapper<>();
        childWrapper.eq(Department::getParentId, id)
                     .eq(Department::getStatus, Constants.STATUS_ACTIVE);
        Long childCount = departmentMapper.selectCount(childWrapper);
        if (childCount != null && childCount > 0) {
            throw new BusinessException(Constants.CODE_BAD_REQUEST, "该部门下存在子部门或人员，无法删除");
        }

        // 校验：无人员
        LambdaQueryWrapper<Employee> empWrapper = new LambdaQueryWrapper<>();
        empWrapper.eq(Employee::getDeptId, id)
                  .eq(Employee::getStatus, Constants.STATUS_ACTIVE);
        Long empCount = employeeMapper.selectCount(empWrapper);
        if (empCount != null && empCount > 0) {
            throw new BusinessException(Constants.CODE_BAD_REQUEST, "该部门下存在子部门或人员，无法删除");
        }

        // 逻辑删除
        dept.setStatus(Constants.STATUS_INACTIVE);
        departmentMapper.updateById(dept);
        log.info("删除部门成功: id={}, name={}", dept.getId(), dept.getName());
    }

    @Override
    @Transactional
    public void move(Long id, DepartmentMoveRequest request) {
        Department dept = departmentMapper.selectById(id);
        if (dept == null) {
            throw new BusinessException(Constants.CODE_NOT_FOUND, "部门不存在");
        }

        Long newParentId = request.getNewParentId();

        // 校验新父部门存在
        Department newParent = departmentMapper.selectById(newParentId);
        if (newParent == null || !Constants.STATUS_ACTIVE.equals(newParent.getStatus())) {
            throw new BusinessException(Constants.CODE_BAD_REQUEST, "目标父部门不存在或已停用");
        }

        // 防循环引用：目标部门的 path 不能以本部门 path 为前缀
        if (newParent.getPath().startsWith(dept.getPath())) {
            throw new BusinessException(Constants.CODE_BAD_REQUEST, "不能将部门移动到自身或子孙部门下");
        }

        // 校验目标层级深度不超过6层
        int newParentDepth = countDepth(newParent.getPath());
        int subTreeDepth = getSubTreeDepth(dept);
        if (newParentDepth + subTreeDepth > Constants.MAX_DEPT_DEPTH) {
            throw new BusinessException(Constants.CODE_BAD_REQUEST, "移动后部门层级将超过上限（最多" + Constants.MAX_DEPT_DEPTH + "层）");
        }

        String oldPath = dept.getPath();
        String newPath = newParent.getPath() + "-" + dept.getId();

        // 更新当前部门
        dept.setParentId(newParentId);
        dept.setPath(newPath);
        departmentMapper.updateById(dept);

        // 级联更新所有子孙的 path
        UpdateWrapper<Department> updateWrapper = new UpdateWrapper<>();
        updateWrapper.setSql("path = REPLACE(path, '" + oldPath + "', '" + newPath + "')");
        updateWrapper.likeRight("path", oldPath + "-");
        departmentMapper.update(null, updateWrapper);

        log.info("移动部门成功: id={}, oldPath={}, newPath={}", dept.getId(), oldPath, newPath);
    }

    /**
     * 计算 path 的深度（通过 '-' 数量判断）
     */
    private int countDepth(String path) {
        if (path == null || path.isEmpty()) {
            return 0;
        }
        int count = 1;
        for (char c : path.toCharArray()) {
            if (c == '-') {
                count++;
            }
        }
        return count;
    }

    /**
     * 获取子树的最大深度
     */
    private int getSubTreeDepth(Department dept) {
        // 查询所有子孙节点
        List<Department> descendants = departmentMapper.selectDescendants(dept.getPath());
        int maxDepth = countDepth(dept.getPath());
        for (Department d : descendants) {
            int depth = countDepth(d.getPath());
            if (depth > maxDepth) {
                maxDepth = depth;
            }
        }
        // 返回子树相对深度
        return maxDepth - countDepth(dept.getPath()) + 1;
    }

    /**
     * 将 Department 实体转换为 DepartmentDTO
     */
    private DepartmentDTO convertToDTO(Department dept) {
        DepartmentDTO dto = new DepartmentDTO();
        dto.setId(dept.getId());
        dto.setName(dept.getName());
        dto.setParentId(dept.getParentId());
        dto.setSortOrder(dept.getSortOrder());
        dto.setManagerId(dept.getManagerId());
        dto.setStatus(dept.getStatus());
        dto.setCreatedAt(dept.getCreatedAt());
        dto.setChildren(new ArrayList<>());
        return dto;
    }
}