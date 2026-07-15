import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Employee, EmployeeStatus } from './employee.entity';
import { Department } from '../department/department.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { QueryEmployeeDto } from './dto/query-employee.dto';

@Injectable()
export class EmployeeService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
  ) {}

  /**
   * 检查字段值是否已存在
   */
  async check(field: 'employeeNo' | 'phone', value: string): Promise<{ isExist: boolean }> {
    const existing = await this.employeeRepository.findOne({
      where: { [field]: value, status: EmployeeStatus.ACTIVE },
    });
    return { isExist: !!existing };
  }

  /**
   * 创建员工
   */
  async create(dto: CreateEmployeeDto): Promise<Employee> {
    // 1. 校验部门是否存在
    const department = await this.departmentRepository.findOne({
      where: { id: dto.deptId },
    });
    if (!department) {
      throw new BadRequestException(`部门不存在: deptId=${dto.deptId}`);
    }

    // 2. 校验 employeeNo 唯一性
    const existingByNo = await this.employeeRepository.findOne({
      where: { employee_no: dto.employeeNo },
    });
    if (existingByNo) {
      throw new BadRequestException(`工号已存在: ${dto.employeeNo}`);
    }

    // 3. 校验 phone 唯一性（仅限在职员工）
    const existingByPhone = await this.employeeRepository.findOne({
      where: { phone: dto.phone, status: EmployeeStatus.ACTIVE },
    });
    if (existingByPhone) {
      throw new BadRequestException(`手机号已存在: ${dto.phone}`);
    }

    // 4. 创建并保存
    const employee = this.employeeRepository.create({
      name: dto.name,
      employee_no: dto.employeeNo,
      phone: dto.phone,
      dept_id: dto.deptId,
      position: dto.position || '',
      status: EmployeeStatus.ACTIVE,
      version: 0,
    });

    return this.employeeRepository.save(employee);
  }

  /**
   * 分页查询员工列表
   */
  async findAll(query: QueryEmployeeDto): Promise<{
    list: Employee[];
    total: number;
    page: number;
    size: number;
  }> {
    const page = query.page ?? 1;
    const size = query.size ?? 20;
    const where: any = {};

    // 部门过滤
    if (query.deptId) {
      where.dept_id = query.deptId;
    }

    // 状态过滤（默认 active）
    where.status = query.status && query.status !== '' ? query.status : EmployeeStatus.ACTIVE;

    // 关键词模糊搜索
    let queryBuilder = this.employeeRepository
      .createQueryBuilder('employee')
      .leftJoinAndSelect('employee.department', 'department');

    if (where.dept_id) {
      queryBuilder = queryBuilder.andWhere('employee.dept_id = :deptId', {
        deptId: where.dept_id,
      });
    }
    if (where.status) {
      queryBuilder = queryBuilder.andWhere('employee.status = :status', {
        status: where.status,
      });
    }
    if (query.keyword) {
      queryBuilder = queryBuilder.andWhere(
        '(employee.name LIKE :keyword OR employee.employee_no LIKE :keyword)',
        { keyword: `%${query.keyword}%` },
      );
    }

    const [list, total] = await queryBuilder
      .skip((page - 1) * size)
      .take(size)
      .orderBy('employee.created_at', 'DESC')
      .getManyAndCount();

    return { list, total, page, size };
  }

  /**
   * 查询单个员工
   */
  async findOne(id: number): Promise<Employee> {
    const employee = await this.employeeRepository.findOne({
      where: { id },
      relations: ['department'],
    });
    if (!employee) {
      throw new NotFoundException(`员工不存在: id=${id}`);
    }
    return employee;
  }

  /**
   * 更新员工信息
   */
  async update(id: number, dto: Partial<CreateEmployeeDto>): Promise<Employee> {
    const employee = await this.employeeRepository.findOne({
      where: { id },
    });
    if (!employee) {
      throw new NotFoundException(`员工不存在: id=${id}`);
    }

    if (dto.position !== undefined) employee.position = dto.position;
    if (dto.phone !== undefined) employee.phone = dto.phone;

    return this.employeeRepository.save(employee);
  }

  /**
   * 离职处理
   */
  async resign(id: number, resignDate: string): Promise<Employee> {
    const employee = await this.employeeRepository.findOne({
      where: { id },
    });
    if (!employee) {
      throw new NotFoundException(`员工不存在: id=${id}`);
    }
    if (employee.status === EmployeeStatus.RESIGNED) {
      throw new BadRequestException('员工已离职');
    }

    employee.status = EmployeeStatus.RESIGNED;
    employee.resign_date = new Date(resignDate);

    return this.employeeRepository.save(employee);
  }
}