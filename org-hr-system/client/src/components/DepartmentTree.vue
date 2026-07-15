<template>
  <div class="department-tree">
    <div class="tree-header">
      <h3>组织架构</h3>
    </div>
    <el-tree
      :data="store.treeData"
      :props="treeProps"
      :load="loadNode"
      lazy
      node-key="id"
      highlight-current
      :expand-on-click-node="true"
      @node-click="handleNodeClick"
    >
      <template #default="{ node, data }">
        <span class="tree-node-label">
          <el-icon><Folder /></el-icon>
          <span>{{ data.name }}</span>
        </span>
      </template>
    </el-tree>
  </div>
</template>

<script setup lang="ts">
import { Folder } from '@element-plus/icons-vue'
import { useDepartmentStore } from '@/stores/department'
import type { DepartmentNode } from '@/stores/department'

const store = useDepartmentStore()

const treeProps = {
  label: 'name',
  children: 'children',
  isLeaf: 'leaf',
}

async function loadNode(node: any, resolve: (data: DepartmentNode[]) => void) {
  if (node.level === 0) {
    await store.fetchRootTree()
    resolve(store.treeData)
  } else {
    await store.loadChildren(node.data.id)
    const children = node.data.children || []
    resolve(children)
  }
}

function handleNodeClick(data: DepartmentNode) {
  store.selectDept(data.id)
}
</script>

<style scoped>
.department-tree {
  padding: 12px;
}

.tree-header {
  padding: 8px 0 12px 4px;
  border-bottom: 1px solid #e4e7ed;
  margin-bottom: 8px;
}

.tree-header h3 {
  margin: 0;
  font-size: 15px;
  color: #303133;
}

.tree-node-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
}
</style>