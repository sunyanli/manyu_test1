import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TransferService } from './transfer.service';
import { TransferEmployeeDto } from './dto/transfer-employee.dto';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('api/employees')
export class TransferController {
  constructor(private readonly transferService: TransferService) {}

  /**
   * POST /api/employees/:id/transfer
   * 员工调动
   */
  @Post(':id/transfer')
  @UseGuards(AuthGuard('jwt'))
  @Roles('admin', 'hr')
  transfer(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TransferEmployeeDto,
    @Req() req: any,
  ) {
    return this.transferService.transfer(id, dto, req.user.sub);
  }

  /**
   * GET /api/employees/:id/transfer-logs
   * 查询员工调动记录
   */
  @Get(':id/transfer-logs')
  @UseGuards(AuthGuard('jwt'))
  getTransferLogs(@Param('id', ParseIntPipe) id: number) {
    return this.transferService.getTransferLogs(id);
  }
}