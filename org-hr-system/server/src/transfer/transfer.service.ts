import {
  Injectable,
  NotFoundException,
  HttpException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Employee, EmployeeStatus } from '../employee/employee.entity';
import { Department } from '../department/department.entity';
import { TransferLog } from './transfer-log.entity';
import { TransferEmployeeDto } from './dto/transfer-employee.dto';

@Injectable()
export class TransferService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(TransferLog)
    private readonly transferLogRepo: Repository<TransferLog>,
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
    private readonly dataSource: DataSource,
  ) {}

  async transfer(
    employeeId: number,
    dto: TransferEmployeeDto,
    operatorId: number,
  ) {
    // 1. 查询员工是否存在
    const employee = await this.employeeRepo.findOne({
      where: { id: employeeId },
    });
    if (!employee) {
      throw new NotFoundException('员工不存在');
    }

    // 校验员工状态为 active
    if (employee.status !== EmployeeStatus.ACTIVE) {
      throw new BadRequestException('已离职员工无法调动');
    }

    // 2. 校验目标部门是否存在
    const targetDept = await this.departmentRepo.findOne({
      where: { id: dto.newDeptId },
    });
    if (!targetDept) {
      throw new NotFoundException('目标部门不存在');
    }

    // 3. 乐观锁校验：如果 dto.version 与员工当前 version 不一致，抛 409
    if (dto.version !== undefined && dto.version !== employee.version) {
      throw new HttpException('该员工信息已被他人修改，请刷新重试', 409);
    }

    // 4. 记录调动前信息
    const fromDeptId = employee.dept_id;
    const fromPosition = employee.position;

    // 5-7. 在事务中更新员工并写入调动日志
    await this.dataSource.transaction(async (manager) => {
      // 5. 更新员工的 dept_id 和 position（如有新职位）
      employee.dept_id = dto.newDeptId;
      if (dto.newPosition !== undefined) {
        employee.position = dto.newPosition;
      }

      // 6. 保存员工（version 由 @VersionColumn 自动递增）
      await manager.save(employee);

      // 7. 写入调动日志
      const toPosition = dto.newPosition ?? fromPosition;
      const transferLog = new TransferLog();
      transferLog.employee_id = employeeId;
      transferLog.from_dept_id = fromDeptId;
      transferLog.to_dept_id = dto.newDeptId;
      transferLog.from_position = fromPosition;
      transferLog.to_position = toPosition;
      transferLog.reason = dto.reason ?? null;
      transferLog.operator_id = operatorId;
      await manager.save(transferLog);
    });

    // 8. 级联更新 stub：触发审批流更新（待后续对接审批系统）
    console.log(
      `[Transfer] 员工 ${employeeId} 调动审批流触发：` +
        `从部门 ${fromDeptId}(${fromPosition}) 调至部门 ${dto.newDeptId}(${dto.newPosition ?? fromPosition})，` +
        `操作人 ID: ${operatorId}`,
    );

    // 9. 返回成功消息
    return { msg: '调动成功' };
  }

  async getTransferLogs(employeeId: number) {
    return this.transferLogRepo.find({
      where: { employee_id: employeeId },
      order: { created_at: 'DESC' },
    });
  }
}