import { IsString, IsNotEmpty, IsInt, IsOptional, Matches } from 'class-validator';

export class CreateEmployeeDto {
  @IsString() @IsNotEmpty()
  name: string;

  @IsString() @IsNotEmpty()
  employeeNo: string;

  @IsString() @IsNotEmpty()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone: string;

  @IsInt() @IsNotEmpty()
  deptId: number;

  @IsString() @IsNotEmpty()
  position: string;
}