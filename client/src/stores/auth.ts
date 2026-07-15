import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { LoginUser } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string>(localStorage.getItem('token') || '')
  const user = ref<LoginUser | null>(null)

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isManager = computed(() => user.value?.role === 'manager')

  function setToken(newToken: string) {
    token.value = newToken
    localStorage.setItem('token', newToken)
  }

  function setUser(newUser: LoginUser) {
    user.value = newUser
    localStorage.setItem('user', JSON.stringify(newUser))
  }

  function loadUser() {
    const stored = localStorage.getItem('user')
    if (stored) {
      try {
        user.value = JSON.parse(stored) as LoginUser
      } catch {
        user.value = null
      }
    }
  }

  function login(loginUser: LoginUser, accessToken: string) {
    setToken(accessToken)
    setUser(loginUser)
  }

  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  // 初始化时从 localStorage 恢复用户信息
  loadUser()

  return {
    token,
    user,
    isLoggedIn,
    isAdmin,
    isManager,
    setToken,
    setUser,
    login,
    logout,
    loadUser
  }
})