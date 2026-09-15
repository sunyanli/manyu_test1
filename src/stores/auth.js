import { reactive } from 'vue'

const STORAGE_KEY = 'todo_auth_token'
const USER_KEY = 'todo_auth_username'

function loadToken() {
  try {
    return localStorage.getItem(STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

function loadUsername() {
  try {
    return localStorage.getItem(USER_KEY) || ''
  } catch {
    return ''
  }
}

export const authStore = reactive({
  token: loadToken(),
  username: loadUsername(),

  get isLoggedIn() {
    return !!this.token
  },

  login(token, username) {
    this.token = token
    this.username = username
    try {
      localStorage.setItem(STORAGE_KEY, token)
      localStorage.setItem(USER_KEY, username)
    } catch { /* ignore quota errors */ }
  },

  logout() {
    this.token = ''
    this.username = ''
    try {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(USER_KEY)
    } catch { /* ignore */ }
  }
})