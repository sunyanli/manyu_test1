import request from './request'
import type { ApiResponse, Department, PageResult } from '@/types'

export interface DepartmentQuery {
  keyword?: string
  parentId?: number | null
  page?: number
  size?: number
}

export function getDepartmentTree(params?: DepartmentQuery): Promise<ApiResponse<Department[]>> {
  return request.get('/departments/tree', { params }).then(res => res.data)
}

export function getDepartmentById(id: number): Promise<ApiResponse<Department>> {
  return request.get(`/departments/${id}`).then(res => res.data)
}

export function createDepartment(data: Omit<Department, 'id' | 'children' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Department>> {
  return request.post('/departments', data).then(res => res.data)
}

export function updateDepartment(id: number, data: Partial<Department>): Promise<ApiResponse<Department>> {
  return request.put(`/departments/${id}`, data).then(res => res.data)
}

export function deleteDepartment(id: number): Promise<ApiResponse<null>> {
  return request.delete(`/departments/${id}`).then(res => res.data)
}

export function listDepartments(params?: DepartmentQuery): Promise<ApiResponse<PageResult<Department>>> {
  return request.get('/departments', { params }).then(res => res.data)
}