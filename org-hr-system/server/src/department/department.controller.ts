import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { DepartmentService } from './department.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { MoveDepartmentDto } from './dto/move-department.dto';

@Controller('api/departments')
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  /**
   * GET /api/departments/tree
   * 查询完整树或按 parentId 懒加载子节点
   */
  @Get('tree')
  async getTree(@Query('parentId') parentId?: string) {
    if (parentId) {
      return this.departmentService.findChildren(Number(parentId));
    }
    return this.departmentService.findAll();
  }

  /**
   * POST /api/departments
   * 创建部门
   */
  @Post()
  async create(@Body() dto: CreateDepartmentDto) {
    return this.departmentService.create(dto);
  }

  /**
   * PUT /api/departments/:id
   * 更新部门名称
   */
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body('name') name: string,
  ) {
    return this.departmentService.update(id, name);
  }

  /**
   * DELETE /api/departments/:id
   * 删除部门
   */
  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.departmentService.delete(id);
    return { message: '删除成功' };
  }

  /**
   * PUT /api/departments/:id/move
   * 移动部门
   */
  @Put(':id/move')
  async move(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MoveDepartmentDto,
  ) {
    return this.departmentService.move(id, dto.newParentId);
  }
}