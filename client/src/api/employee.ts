import request from './request'
import type { ApiResponse, Employee, PageResult, CheckResult, TransferRecord } from '@/types'

export interface EmployeeQuery {
  keyword?: string
  deptId?: number
  status?: string
  page?: number
  size?: number
}

export interface EmployeeCreateData {
  name: string
  phone: string
  position: string
  deptId: number
}

export interface EmployeeUpdateData {
  name?: string
  phone?: string
  position?: string
  status?: 'active' | 'resigned'
  deptId?: number
  version: number
}

export function listEmployees(params?: EmployeeQuery): Promise<ApiResponse<PageResult<Employee>>> {
  return request.get('/employees', { params }).then(res => res.data)
}

export function getEmployeeById(id: number): Promise<ApiResponse<Employee>> {
  return request.get(`/employees/${id}`).then(res => res.data)
}

export function createEmployee(data: EmployeeCreateData): Promise<ApiResponse<Employee>> {
  return request.post('/employees', data).then(res => res.data)
}

export function updateEmployee(id: number, data: EmployeeUpdateData): Promise<ApiResponse<Employee>> {
  return request.put(`/employees/${id}`, data).then(res => res.data)
}

export function deleteEmployee(id: number): Promise<ApiResponse<null>> {
  return request.delete(`/employees/${id}`).then(res => res.data)
}

export function transferEmployee(id: number, data: {
  toDeptId: number
  toPosition: string
  reason?: string
}): Promise<ApiResponse<Employee>> {
  return request.post(`/employees/${id}/transfer`, data).then(res => res.data)
}

export function getTransferHistory(id: number): Promise<ApiResponse<TransferRecord[]>> {
  return request.get(`/employees/${id}/transfers`).then(res => res.data)
}

export function checkEmployeeNo(employeeNo: string): Promise<ApiResponse<CheckResult>> {
  return request.get('/employees/check-no', { params: { employeeNo } }).then(res => res.data)
}