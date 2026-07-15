import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EmployeeService } from './employee.service';
import { CheckEmployeeDto } from './dto/check-employee.dto';
import { QueryEmployeeDto } from './dto/query-employee.dto';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('api/employees')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  /**
   * GET /api/employees/check?field=employeeNo&value=10086
   * 检查字段值是否已存在
   */
  @Get('check')
  check(@Query() query: CheckEmployeeDto) {
    return this.employeeService.check(query.field, query.value);
  }

  /**
   * POST /api/employees
   * 创建员工
   */
  @Post()
  @Roles('admin', 'hr')
  create(@Body() dto: CreateEmployeeDto) {
    return this.employeeService.create(dto);
  }

  /**
   * GET /api/employees?page=1&size=20&deptId=2&status=active&keyword=张三
   * 分页查询员工列表
   */
  @Get()
  @UseGuards(AuthGuard('jwt'))
  findAll(@Query() query: QueryEmployeeDto) {
    return this.employeeService.findAll(query);
  }

  /**
   * GET /api/employees/:id
   * 查询单个员工
   */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.employeeService.findOne(id);
  }

  /**
   * PUT /api/employees/:id
   * 更新员工信息
   */
  @Put(':id')
  @Roles('admin', 'hr', 'dept_manager')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateEmployeeDto>,
  ) {
    return this.employeeService.update(id, dto);
  }

  /**
   * PUT /api/employees/:id/resign
   * 员工离职
   */
  @Put(':id/resign')
  @Roles('admin', 'hr')
  resign(
    @Param('id', ParseIntPipe) id: number,
    @Body('resignDate') resignDate: string,
  ) {
    return this.employeeService.resign(id, resignDate);
  }
}