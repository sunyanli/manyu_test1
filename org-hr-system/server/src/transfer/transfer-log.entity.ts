import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('transfer_logs')
export class TransferLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  employee_id: number;

  @Column({ type: 'int' })
  from_dept_id: number;

  @Column({ type: 'int' })
  to_dept_id: number;

  @Column({ type: 'varchar', length: 100 })
  from_position: string;

  @Column({ type: 'varchar', length: 100 })
  to_position: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  reason: string;

  @Column({ type: 'int', nullable: true })
  operator_id: number;

  @CreateDateColumn()
  created_at: Date;
}