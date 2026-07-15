import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class CheckEmployeeDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['employeeNo', 'phone'])
  field: string;

  @IsString()
  @IsNotEmpty()
  value: string;
}