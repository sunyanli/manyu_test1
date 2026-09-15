import axios from 'axios'
import { authStore } from '../stores/auth'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor: attach JWT token
api.interceptors.request.use(config => {
  const token = authStore.token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor: handle 401 → auto logout
api.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response) {
      const { status, data } = error.response
      if (status === 401) {
        authStore.logout()
      }
      return Promise.reject(data || { code: 'ERR_001', msg: 'Request failed' })
    }
    return Promise.reject({
      code: 'ERR_NET_001',
      msg: '网络连接失败，请检查网络后重试'
    })
  }
)

// ─── Auth API ───
export function login(username, password) {
  return api.post('/auth/login', { username, password })
}

// ─── Todo API ───
export function listTodos() {
  return api.get('/todos')
}

export function createTodo(name) {
  return api.post('/todos', { name })
}

export function updateTodoStatus(id, status) {
  return api.put(`/todos/${id}/status`, { status })
}

export function deleteTodo(id) {
  return api.delete(`/todos/${id}`)
}