import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './department.entity';
import { Employee } from '../employee/employee.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';

@Injectable()
export class DepartmentService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
  ) {}

  /**
   * 查询所有部门，返回树形结构
   */
  async findAll(): Promise<Department[]> {
    return this.buildTree(null);
  }

  /**
   * 按 parent_id 查询直接子节点（用于懒加载）
   */
  async findChildren(parentId: number): Promise<Department[]> {
    return this.departmentRepo.find({
      where: { parent_id: parentId },
      order: { sort_order: 'ASC' },
    });
  }

  /**
   * 递归构建树形结构，返回带 children 的节点数组
   */
  async buildTree(parentId: number | null): Promise<Department[]> {
    const nodes = await this.departmentRepo.find({
      where: { parent_id: parentId },
      order: { sort_order: 'ASC' },
    });

    const result: Department[] = [];
    for (const node of nodes) {
      const children = await this.buildTree(node.id);
      result.push({
        ...node,
        children: children.length > 0 ? children : undefined,
      } as Department & { children?: Department[] });
    }
    return result;
  }

  /**
   * 创建部门时自动计算 path
   */
  async create(dto: CreateDepartmentDto): Promise<Department> {
    const department = this.departmentRepo.create({
      name: dto.name,
      parent_id: dto.parentId ?? null,
      sort_order: dto.sortOrder ?? 0,
    });

    // 先保存获取 id
    const saved = await this.departmentRepo.save(department);

    // 计算 path
    if (dto.parentId) {
      const parent = await this.departmentRepo.findOne({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new NotFoundException('父部门不存在');
      }
      saved.path = parent.path + '-' + saved.id.toString();
    } else {
      saved.path = saved.id.toString();
    }

    return this.departmentRepo.save(saved);
  }

  /**
   * 更新部门名称
   */
  async update(id: number, name: string): Promise<Department> {
    const department = await this.departmentRepo.findOne({ where: { id } });
    if (!department) {
      throw new NotFoundException('部门不存在');
    }
    department.name = name;
    return this.departmentRepo.save(department);
  }

  /**
   * 删除部门前校验：是否有子部门、是否有关联员工
   */
  async delete(id: number): Promise<void> {
    const department = await this.departmentRepo.findOne({ where: { id } });
    if (!department) {
      throw new NotFoundException('部门不存在');
    }

    // 检查是否有子部门
    const childCount = await this.departmentRepo.count({
      where: { parent_id: id },
    });
    if (childCount > 0) {
      throw new BadRequestException('该部门下存在子部门，无法删除');
    }

    // 检查是否有关联员工
    // 假设 Employee 实体中 department 关联字段名为 department
    const employeeCount = await this.employeeRepo.count({
      where: { department: { id } },
    });
    if (employeeCount > 0) {
      throw new BadRequestException('该部门下存在员工，无法删除');
    }

    await this.departmentRepo.remove(department);
  }

  /**
   * 移动部门到新的父节点
   */
  async move(id: number, newParentId: number): Promise<Department> {
    const department = await this.departmentRepo.findOne({ where: { id } });
    if (!department) {
      throw new NotFoundException('部门不存在');
    }

    // 校验 newParentId 对应的部门是否存在
    const newParent = await this.departmentRepo.findOne({
      where: { id: newParentId },
    });
    if (!newParent) {
      throw new NotFoundException('目标父部门不存在');
    }

    // 循环引用检测：newParentId 不能是 id 自身
    if (id === newParentId) {
      throw new BadRequestException('不能将部门移动到自己下面');
    }

    // 循环引用检测：newParentId 不能是 id 的子孙节点
    // 如果目标部门的 path 以当前部门的 path 开头，则是后代节点
    if (newParent.path.startsWith(department.path + '-')) {
      throw new BadRequestException('不能将部门移动到其子部门下');
    }

    const oldPath = department.path;

    // 更新当前部门的 parent_id 和 path
    department.parent_id = newParentId;
    department.path = newParent.path + '-' + department.id.toString();
    await this.departmentRepo.save(department);

    // 更新所有子孙部门的 path
    await this.updateChildrenPath(oldPath, department.path);

    return department;
  }

  /**
   * 递归更新所有子孙部门的 path
   */
  private async updateChildrenPath(
    oldParentPath: string,
    newParentPath: string,
  ): Promise<void> {
    // 所有 path 以 oldParentPath + '-' 开头的都需要更新
    const allDescendants = await this.departmentRepo
      .createQueryBuilder('department')
      .where('department.path LIKE :oldPathPattern', {
        oldPathPattern: oldParentPath + '-%',
      })
      .getMany();

    for (const child of allDescendants) {
      child.path = newParentPath + child.path.substring(oldParentPath.length);
      await this.departmentRepo.save(child);
    }
  }
}