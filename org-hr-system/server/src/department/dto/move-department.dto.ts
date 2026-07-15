import { IsInt, IsNotEmpty } from 'class-validator';

export class MoveDepartmentDto {
  @IsInt()
  @IsNotEmpty()
  newParentId: number;
}