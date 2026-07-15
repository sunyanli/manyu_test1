<template>
  <div class="layout-container">
    <header class="layout-header">
      <div class="header-left">
        <h1 class="system-title">组织架构与人员管理系统</h1>
      </div>
      <div class="header-right">
        <span class="username">{{ username }}</span>
        <el-button type="danger" text @click="handleLogout">退出登录</el-button>
      </div>
    </header>
    <div class="layout-body">
      <aside class="layout-sidebar">
        <DepartmentTree />
      </aside>
      <main class="layout-main">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import DepartmentTree from '@/components/DepartmentTree.vue'

const router = useRouter()
const username = ref(localStorage.getItem('username') || '用户')

function handleLogout() {
  localStorage.removeItem('token')
  localStorage.removeItem('username')
  router.push('/login')
}
</script>

<style scoped>
.layout-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.layout-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 56px;
  background-color: #409eff;
  color: #fff;
  flex-shrink: 0;
}

.system-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.username {
  font-size: 14px;
  opacity: 0.9;
}

.layout-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.layout-sidebar {
  width: 260px;
  flex-shrink: 0;
  border-right: 1px solid #e4e7ed;
  overflow-y: auto;
  background-color: #fafafa;
}

.layout-main {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background-color: #f5f7fa;
}
</style>