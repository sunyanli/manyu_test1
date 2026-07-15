import { IsInt, IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class TransferEmployeeDto {
  @IsInt()
  @IsNotEmpty()
  newDeptId: number;

  @IsString()
  @IsNotEmpty()
  newPosition: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsInt()
  @IsNotEmpty()
  version: number;
}