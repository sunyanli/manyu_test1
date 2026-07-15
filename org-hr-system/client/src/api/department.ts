import request from '@/utils/request'

export function getDepartmentTree(parentId?: number) {
  return request({ url: '/departments/tree', method: 'get', params: { parentId } })
}

export function createDepartment(data: { name: string; parent_id?: number; sort_order?: number }) {
  return request({ url: '/departments', method: 'post', data })
}

export function updateDepartment(id: number, data: { name?: string; sort_order?: number }) {
  return request({ url: `/departments/${id}`, method: 'put', data })
}

export function deleteDepartment(id: number) {
  return request({ url: `/departments/${id}`, method: 'delete' })
}

export function moveDepartment(id: number, newParentId: number) {
  return request({ url: `/departments/${id}/move`, method: 'put', data: { newParentId } })
}