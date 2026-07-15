import request from '@/utils/request'

export function checkEmployee(field: string, value: string) {
  return request({ url: '/employees/check', method: 'get', params: { field, value } })
}

export function getEmployees(params: {
  page: number; size: number; deptId?: number; status?: string; keyword?: string
}) {
  return request({ url: '/employees', method: 'get', params })
}

export function getEmployee(id: number) {
  return request({ url: `/employees/${id}`, method: 'get' })
}

export function createEmployee(data: any) {
  return request({ url: '/employees', method: 'post', data })
}

export function updateEmployee(id: number, data: any) {
  return request({ url: `/employees/${id}`, method: 'put', data })
}

export function transferEmployee(id: number, data: { newDeptId: number; newPosition: string; reason: string }) {
  return request({ url: `/employees/${id}/transfer`, method: 'post', data })
}

export function resignEmployee(id: number, data: { resignDate: string }) {
  return request({ url: `/employees/${id}/resign`, method: 'put', data })
}