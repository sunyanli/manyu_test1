import { DataSource } from 'typeorm';
import { Department } from './src/department/department.entity';
import { Employee } from './src/employee/employee.entity';
import { TransferLog } from './src/transfer/transfer-log.entity';

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'org_hr',
  entities: [Department, Employee, TransferLog],
  synchronize: true, // 开发环境自动建表
  logging: process.env.NODE_ENV !== 'production',
  migrations: [],
  subscribers: [],
});