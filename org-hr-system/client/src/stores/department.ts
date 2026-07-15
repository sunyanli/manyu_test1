import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getDepartmentTree } from '@/api/department'
import request from '@/utils/request'

export interface DepartmentNode {
  id: number
  name: string
  parent_id: number | null
  sort_order: number
  children?: DepartmentNode[]
}

export const useDepartmentStore = defineStore('department', () => {
  const treeData = ref<DepartmentNode[]>([])
  const loadingMap = ref<Record<number, boolean>>({})
  const selectedDeptId = ref<number | null>(null)

  async function fetchRootTree() {
    const res = await getDepartmentTree() as DepartmentNode[]
    treeData.value = res
  }

  async function loadChildren(parentId: number) {
    loadingMap.value[parentId] = true
    try {
      const res = await getDepartmentTree(parentId) as DepartmentNode[]
      // 递归更新对应节点的 children
      function updateNode(nodes: DepartmentNode[]): boolean {
        for (const node of nodes) {
          if (node.id === parentId) {
            node.children = res
            return true
          }
          if (node.children && updateNode(node.children)) {
            return true
          }
        }
        return false
      }
      updateNode(treeData.value)
    } finally {
      loadingMap.value[parentId] = false
    }
  }

  function selectDept(id: number | null) {
    selectedDeptId.value = id
  }

  async function moveDepartment(id: number, newParentId: number) {
    await request({ url: `/departments/${id}/move`, method: 'put', data: { newParentId } })
    await fetchRootTree()
  }

  return {
    treeData,
    loadingMap,
    selectedDeptId,
    fetchRootTree,
    loadChildren,
    selectDept,
    moveDepartment,
  }
})