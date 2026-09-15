<template>
  <div class="tab-content">
    <!-- 创建待办表单 -->
    <div class="todo-form">
      <h3>创建待办事项</h3>
      <div class="form-row">
        <input
          v-model="itemName"
          type="text"
          placeholder="请输入事项名称（1~200 字符）"
          maxlength="200"
          class="form-input"
          @keyup.enter="handleCreate"
        />
        <button
          class="btn-create"
          :disabled="creating || !itemName.trim()"
          @click="handleCreate"
        >
          {{ creating ? '创建中...' : '创建' }}
        </button>
      </div>
      <p v-if="createError" class="form-error">{{ createError }}</p>
    </div>

    <!-- 筛选栏 -->
    <div class="todo-filter">
      <label>状态筛选：</label>
      <select v-model="filterStatus" @change="fetchList" class="filter-select">
        <option value="">全部</option>
        <option value="PENDING">待办中</option>
        <option value="COMPLETED">已完成</option>
        <option value="CANCELLED">已取消</option>
      </select>
    </div>

    <!-- 列表区域 -->
    <div v-if="listLoading" class="state-loading">加载中...</div>
    <div v-else-if="listError" class="state-error">
      <p>{{ listError.message || listError }}</p>
      <button @click="fetchList" class="btn-retry">重新加载</button>
    </div>
    <div v-else-if="todoList.length === 0" class="state-empty">
      <p>暂无待办事项</p>
    </div>
    <div v-else class="todo-list">
      <div
        v-for="item in todoList"
        :key="item.id"
        class="todo-item"
      >
        <div class="todo-info">
          <span class="todo-name">{{ item.item_name }}</span>
          <span :class="['todo-status', 'status-' + item.status.toLowerCase()]">
            {{ statusLabel(item.status) }}
          </span>
        </div>
        <span class="todo-time">{{ item.gmt_create }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { createTodoItem, listTodoItems, trackEvent } from '../api/index.js'

const itemName = ref('')
const creating = ref(false)
const createError = ref('')

const filterStatus = ref('')
const todoList = ref([])
const listLoading = ref(true)
const listError = ref(null)

function statusLabel(status) {
  const map = { PENDING: '待办中', COMPLETED: '已完成', CANCELLED: '已取消' }
  return map[status] || status
}

async function handleCreate() {
  if (creating.value) return // 显式防抖 guard
  const name = itemName.value.trim()
  if (!name) {
    createError.value = '事项名称不能为空'
    return
  }
  if (name.length > 200) {
    createError.value = '事项名称不能超过 200 字符'
    return
  }
  createError.value = ''
  creating.value = true
  try {
    await createTodoItem(name)
    trackEvent({ api_name: 'todo_create' }).catch(() => {})
    itemName.value = ''
    await fetchList()
  } catch (err) {
    createError.value = err.message || err.msg || '创建失败，请稍后重试'
  } finally {
    creating.value = false
  }
}

async function fetchList() {
  listLoading.value = true
  listError.value = null
  try {
    const res = await listTodoItems(filterStatus.value || undefined)
    todoList.value = res.data || []
    trackEvent({ api_name: 'todo_list' }).catch(() => {})
  } catch (err) {
    listError.value = err
  } finally {
    listLoading.value = false
  }
}

onMounted(fetchList)
</script>

<style scoped>
.tab-content { padding: 20px; }
.state-loading { text-align: center; padding: 40px; color: #999; }
.state-error { text-align: center; padding: 40px; color: #e74c3c; }
.state-error p { margin-bottom: 16px; }
.state-empty { text-align: center; padding: 40px; color: #999; font-size: 15px; }
.btn-retry { padding: 8px 24px; background: #3498db; color: #fff; border: none; border-radius: 4px; cursor: pointer; }

.todo-form { margin-bottom: 24px; }
.todo-form h3 { font-size: 18px; color: #2c3e50; margin-bottom: 12px; }
.form-row { display: flex; gap: 8px; }
.form-input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}
.form-input:focus { border-color: #3498db; }
.btn-create {
  padding: 10px 24px;
  background: #3498db;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap;
  transition: opacity 0.2s;
}
.btn-create:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-create:hover:not(:disabled) { background: #2980b9; }
.form-error { color: #e74c3c; font-size: 13px; margin-top: 8px; }

.todo-filter {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #eee;
}
.todo-filter label { font-size: 14px; color: #666; }
.filter-select {
  padding: 6px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 14px;
  outline: none;
  background: #fff;
}

.todo-list { display: flex; flex-direction: column; gap: 8px; }
.todo-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  transition: box-shadow 0.2s;
}
.todo-item:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.todo-info { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
.todo-name { font-size: 15px; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.todo-status { font-size: 12px; padding: 2px 8px; border-radius: 10px; white-space: nowrap; }
.status-pending { background: #fdf6ec; color: #e6a23c; }
.status-completed { background: #f0f9eb; color: #67c23a; }
.status-cancelled { background: #f4f4f5; color: #909399; }
.todo-time { font-size: 13px; color: #999; white-space: nowrap; margin-left: 12px; }
</style>
