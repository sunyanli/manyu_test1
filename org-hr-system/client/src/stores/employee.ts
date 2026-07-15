import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  getEmployees,
  checkEmployee,
  createEmployee as apiCreateEmployee,
  updateEmployee as apiUpdateEmployee,
  transferEmployee as apiTransferEmployee,
  resignEmployee as apiResignEmployee,
} from '@/api/employee'

export interface EmployeeFilters {
  deptId?: number
  status?: string
  keyword?: string
}

export interface Employee {
  id: number
  name: string
  employee_number: string
  gender: string
  phone: string
  email: string
  department_id: number
  position: string
  status: string
  version: number
  created_at: string
  updated_at: string
}

export const useEmployeeStore = defineStore('employee', () => {
  const employeeList = ref<Employee[]>([])
  const total = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(20)
  const filters = ref<EmployeeFilters>({})
  const loading = ref(false)

  async function fetchEmployees() {
    loading.value = true
    try {
      const res = await getEmployees({
        page: currentPage.value,
        size: pageSize.value,
        deptId: filters.value.deptId,
        status: filters.value.status,
        keyword: filters.value.keyword,
      }) as any
      employeeList.value = res.data || res.records || []
      total.value = res.total || 0
    } finally {
      loading.value = false
    }
  }

  async function checkUnique(field: string, value: string) {
    return await checkEmployee(field, value) as any
  }

  async function createEmployee(data: any) {
    return await apiCreateEmployee(data)
  }

  async function updateEmployee(id: number, data: any) {
    return await apiUpdateEmployee(id, data)
  }

  async function transferEmployee(id: number, data: { newDeptId: number; newPosition: string; reason: string }) {
    return await apiTransferEmployee(id, data)
  }

  async function resignEmployee(id: number, data: { resignDate: string }) {
    return await apiResignEmployee(id, data)
  }

  function setPage(page: number) {
    currentPage.value = page
  }

  function setFilters(newFilters: EmployeeFilters) {
    filters.value = { ...filters.value, ...newFilters }
    currentPage.value = 1
  }

  return {
    employeeList,
    total,
    currentPage,
    pageSize,
    filters,
    loading,
    fetchEmployees,
    checkUnique,
    createEmployee,
    updateEmployee,
    transferEmployee,
    resignEmployee,
    setPage,
    setFilters,
  }
})