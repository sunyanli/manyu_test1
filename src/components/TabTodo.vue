<template>
  <div class="todo-container">
    <!-- Login form (shown when not authenticated) -->
    <div v-if="!authStore.isLoggedIn" class="login-form">
      <h2 class="login-title">🔐 内部用户登录</h2>
      <div class="form-group">
        <label>用户名</label>
        <input
          v-model="loginForm.username"
          type="text"
          placeholder="请输入用户名"
          @keyup.enter="handleLogin"
          @input="loginError = ''"
        />
      </div>
      <div class="form-group">
        <label>密码</label>
        <input
          v-model="loginForm.password"
          type="password"
          placeholder="请输入密码"
          @keyup.enter="handleLogin"
          @input="loginError = ''"
        />
      </div>
      <p v-if="loginError" class="error-msg">{{ loginError }}</p>
      <button class="btn btn-primary" :disabled="loggingIn" @click="handleLogin">
        {{ loggingIn ? '登录中...' : '登 录' }}
      </button>
    </div>

    <!-- Todo list (shown when authenticated) -->
    <div v-else class="todo-main">
      <div class="todo-header">
        <h2>📋 我的待办事项</h2>
        <div class="user-info">
          <span class="username">{{ authStore.username }}</span>
          <button class="btn btn-link" @click="authStore.logout()">退出</button>
        </div>
      </div>

      <!-- Create todo input -->
      <div class="todo-input-row">
        <input
          v-model="newItemName"
          type="text"
          class="todo-input"
          placeholder="输入待办事项名称，按回车添加"
          maxlength="200"
          @keyup.enter="handleCreate"
          @input="createError = ''"
        />
        <button class="btn btn-primary" :disabled="creating" @click="handleCreate">
          {{ creating ? '添加中...' : '添加' }}
        </button>
      </div>
      <p v-if="createError" class="error-msg">{{ createError }}</p>

      <!-- Loading state -->
      <div v-if="loading" class="loading-hint">加载中...</div>

      <!-- Empty state -->
      <div v-else-if="items.length === 0" class="empty-hint">
        🎉 暂无待办事项，快去添加一条吧！
      </div>

      <!-- Todo list -->
      <ul v-else class="todo-list">
        <li
          v-for="item in items"
          :key="item.id"
          :class="['todo-item', { completed: item.status === 'COMPLETED' }]"
        >
          <label class="todo-checkbox-label">
            <input
              type="checkbox"
              :checked="item.status === 'COMPLETED'"
              @change="handleToggleStatus(item)"
            />
            <span class="checkmark"></span>
          </label>
          <span class="todo-name">{{ item.name }}</span>
          <span class="todo-meta">
            <span v-if="item.status === 'COMPLETED'" class="status-badge completed-badge">已完成</span>
            <span v-else class="status-badge pending-badge">待处理</span>
          </span>
          <button class="btn-delete" title="删除" @click="handleDelete(item)">✕</button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { authStore } from '../stores/auth'
import { login, listTodos, createTodo, updateTodoStatus, deleteTodo } from '../api/todo'

// ─── Login state ───
const loginForm = ref({ username: '', password: '' })
const loginError = ref('')
const loggingIn = ref(false)

async function handleLogin() {
  const { username, password } = loginForm.value
  if (!username.trim()) {
    loginError.value = '请输入用户名'
    return
  }
  if (!password) {
    loginError.value = '请输入密码'
    return
  }

  loggingIn.value = true
  loginError.value = ''
  try {
    const res = await login(username.trim(), password)
    authStore.login(res.data.token, res.data.username)
    loginForm.value = { username: '', password: '' }
    await fetchTodos()
  } catch (err) {
    loginError.value = (err && (err.msg || err.message)) || '登录失败，请检查用户名和密码'
  } finally {
    loggingIn.value = false
  }
}

// ─── Todo CRUD ───
const newItemName = ref('')
const items = ref([])
const loading = ref(false)
const creating = ref(false)
const createError = ref('')

async function fetchTodos() {
  loading.value = true
  try {
    const res = await listTodos()
    items.value = (res.data || []).filter(item => item.status !== 'DELETED')
  } catch {
    items.value = []
  } finally {
    loading.value = false
  }
}

async function handleCreate() {
  const name = newItemName.value.trim()
  if (!name) {
    createError.value = '待办事项名称不能为空'
    return
  }
  if (name.length > 200) {
    createError.value = '待办事项名称不能超过200个字符'
    return
  }

  creating.value = true
  createError.value = ''
  try {
    await createTodo(name)
    newItemName.value = ''
    await fetchTodos()
  } catch (err) {
    createError.value = (err && (err.msg || err.message)) || '添加失败，请重试'
  } finally {
    creating.value = false
  }
}

async function handleToggleStatus(item) {
  const newStatus = item.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED'
  try {
    await updateTodoStatus(item.id, newStatus)
    await fetchTodos()
  } catch {
    // silently fail; list will refresh
  }
}

async function handleDelete(item) {
  try {
    await deleteTodo(item.id)
    await fetchTodos()
  } catch {
    // silently fail
  }
}

onMounted(() => {
  if (authStore.isLoggedIn) {
    fetchTodos()
  }
})
</script>

<style scoped>
.todo-container {
  padding: 24px;
  min-height: 300px;
}

/* ─── Login ─── */
.login-form {
  max-width: 380px;
  margin: 40px auto;
  padding: 32px 28px;
  background: #fafafa;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}
.login-title {
  text-align: center;
  font-size: 20px;
  margin-bottom: 24px;
  color: #2c3e50;
}
.form-group {
  margin-bottom: 16px;
}
.form-group label {
  display: block;
  font-size: 14px;
  color: #555;
  margin-bottom: 6px;
}
.form-group input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d0d0d0;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}
.form-group input:focus {
  border-color: #3498db;
}
.error-msg {
  color: #e74c3c;
  font-size: 13px;
  margin-top: -8px;
  margin-bottom: 12px;
}

/* ─── Buttons ─── */
.btn {
  padding: 10px 24px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s, opacity 0.2s;
}
.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.btn-primary {
  background: #3498db;
  color: #fff;
  width: 100%;
}
.btn-primary:hover:not(:disabled) {
  background: #2980b9;
}
.btn-link {
  background: none;
  color: #3498db;
  padding: 4px 8px;
  text-decoration: underline;
}

/* ─── Todo Main ─── */
.todo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.todo-header h2 {
  font-size: 20px;
  color: #2c3e50;
  margin: 0;
}
.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
}
.username {
  font-size: 13px;
  color: #888;
}

/* Input row */
.todo-input-row {
  display: flex;
  gap: 10px;
  margin-bottom: 4px;
}
.todo-input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #d0d0d0;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}
.todo-input:focus {
  border-color: #3498db;
}
.todo-input-row .btn {
  width: auto;
  flex-shrink: 0;
}

/* Loading & empty */
.loading-hint,
.empty-hint {
  text-align: center;
  padding: 40px 0;
  color: #999;
  font-size: 15px;
}

/* Todo list */
.todo-list {
  list-style: none;
  padding: 0;
  margin: 16px 0 0;
}
.todo-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.15s;
}
.todo-item:hover {
  background: #f9f9f9;
}
.todo-item.completed .todo-name {
  text-decoration: line-through;
  color: #aaa;
}

/* Checkbox */
.todo-checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
}
.todo-checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #27ae60;
}

.todo-name {
  flex: 1;
  font-size: 15px;
  color: #333;
  word-break: break-word;
}

.todo-meta {
  flex-shrink: 0;
}
.status-badge {
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 12px;
  font-weight: 500;
}
.pending-badge {
  background: #fef3cd;
  color: #856404;
}
.completed-badge {
  background: #d4edda;
  color: #155724;
}

.btn-delete {
  background: none;
  border: none;
  color: #ccc;
  font-size: 16px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: color 0.15s, background 0.15s;
  flex-shrink: 0;
}
.btn-delete:hover {
  color: #e74c3c;
  background: #fdf0ef;
}
</style>