import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, VersionColumn } from 'typeorm';
import { Department } from '../department/department.entity';

export enum EmployeeStatus {
  ACTIVE = 'active',
  RESIGNED = 'resigned',
}

@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  name: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  employee_no: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  phone: string;

  @Column({ type: 'int' })
  dept_id: number;

  @Column({ type: 'varchar', length: 100 })
  position: string;

  @Column({ type: 'enum', enum: EmployeeStatus, default: EmployeeStatus.ACTIVE })
  status: EmployeeStatus;

  @VersionColumn()
  version: number;

  @Column({ type: 'date', nullable: true })
  resign_date: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Department, (dept) => dept.employees)
  @JoinColumn({ name: 'dept_id' })
  department: Department;
}