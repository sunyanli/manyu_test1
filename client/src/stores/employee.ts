import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import type { Employee } from '@/types'
import { listEmployees, type EmployeeQuery } from '@/api/employee'

export const useEmployeeStore = defineStore('employee', () => {
  const list = ref<Employee[]>([])
  const total = ref(0)
  const loading = ref(false)
  const query = reactive<EmployeeQuery>({
    keyword: '',
    deptId: undefined,
    status: undefined,
    page: 1,
    size: 10
  })

  async function fetchList() {
    loading.value = true
    try {
      const res = await listEmployees(query)
      list.value = res.data.list || []
      total.value = res.data.total
    } catch (error) {
      console.error('获取人员列表失败:', error)
      list.value = []
      total.value = 0
    } finally {
      loading.value = false
    }
  }

  function setPage(page: number) {
    query.page = page
  }

  function setSize(size: number) {
    query.size = size
    query.page = 1
  }

  function setKeyword(keyword: string) {
    query.keyword = keyword
    query.page = 1
  }

  function setDeptFilter(deptId: number | undefined) {
    query.deptId = deptId
    query.page = 1
  }

  function setStatusFilter(status: string | undefined) {
    query.status = status
    query.page = 1
  }

  function resetQuery() {
    query.keyword = ''
    query.deptId = undefined
    query.status = undefined
    query.page = 1
    query.size = 10
  }

  return {
    list,
    total,
    loading,
    query,
    fetchList,
    setPage,
    setSize,
    setKeyword,
    setDeptFilter,
    setStatusFilter,
    resetQuery
  }
})