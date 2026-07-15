export interface Department {
  id: number
  name: string
  parentId: number | null
  path: string | null
  sortOrder: number
  children?: Department[]
  createdAt?: string
  updatedAt?: string
}

export interface Employee {
  id: number
  name: string
  employeeNo: string
  phone: string
  position: string
  status: 'active' | 'resigned'
  version: number
  deptId: number
  department?: Department
  createdAt?: string
  updatedAt?: string
}

export interface TransferRecord {
  id: number
  employeeId: number
  fromDeptId: number | null
  toDeptId: number
  fromPosition: string | null
  toPosition: string
  reason: string | null
  operatorId: number | null
  createdAt: string
}

export interface ApiResponse<T = any> {
  code: number
  msg?: string
  data: T
}

export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  size: number
}

export interface CheckResult {
  isExist: boolean
}

export interface LoginUser {
  id: number
  username: string
  role: 'admin' | 'manager'
  deptId?: number
}