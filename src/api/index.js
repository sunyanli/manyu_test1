import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'X-Caller-Info': JSON.stringify({
      caller: 'demo_user',
      person_type: 'developer',
      person_level: 'senior',
      person_department: 'engineering'
    })
  }
})

// 响应拦截器：统一处理错误
api.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response && error.response.data) {
      return Promise.reject(error.response.data)
    }
    return Promise.reject({
      success: false,
      error_code: 'ERR_NET_001',
      message: '网络连接失败，请检查网络后重试',
      detail: null
    })
  }
)

export function getHelloWorld() {
  return api.get('/helloworld')
}

export function getHash(text) {
  return api.get('/hash', { params: { text } })
}

export function postBubbleSort(array) {
  return api.post('/bubble-sort', { array })
}

export function trackEvent(eventData) {
  return api.post('/track/event', eventData)
}

export function getStats(dimension) {
  return api.get('/track/stats', { params: { dimension } })
}

export function getExportUrl(tab) {
  return `/api/export?tab=${tab}&format=csv`
}