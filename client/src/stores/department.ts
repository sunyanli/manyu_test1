import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Department } from '@/types'
import { getDepartmentTree } from '@/api/department'

export const useDepartmentStore = defineStore('department', () => {
  const tree = ref<Department[]>([])
  const selectedNode = ref<Department | null>(null)
  const loading = ref(false)

  async function fetchTree() {
    loading.value = true
    try {
      const res = await getDepartmentTree()
      tree.value = res.data || []
    } catch (error) {
      console.error('获取部门树失败:', error)
      tree.value = []
    } finally {
      loading.value = false
    }
  }

  function setSelectedNode(node: Department | null) {
    selectedNode.value = node
  }

  function expandNode(node: Department) {
    // 递归查找并展开节点
    function expand(treeNodes: Department[]): boolean {
      for (const item of treeNodes) {
        if (item.id === node.id) {
          return true
        }
        if (item.children && item.children.length > 0) {
          if (expand(item.children)) {
            return true
          }
        }
      }
      return false
    }
    expand(tree.value)
  }

  return {
    tree,
    selectedNode,
    loading,
    fetchTree,
    setSelectedNode,
    expandNode
  }
})