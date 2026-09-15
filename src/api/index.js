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
  response => {
    const data = response.data
    // 业务错误检测：HTTP 200 但业务层失败
    if (data && data.result && data.result !== 'OK' && data.result !== 'SUCCESS') {
      return Promise.reject({
        error_code: data.result,
        message: data.msg || data.message || '业务处理失败'
      })
    }
    return data
  },
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

/**
 * 创建待办事项
 * @param {string} itemName - 事项名称（1~200 字符，不能为空）
 * @returns {Promise<Object>} 创建结果，包含新建事项的详细信息
 */
export function createTodoItem(itemName) {
  return api.post('/todo', { item_name: itemName })
}

/**
 * 查询待办事项列表
 * @param {string} [status] - 可选筛选条件，合法值：'PENDING' | 'COMPLETED' | 'CANCELLED'
 * @returns {Promise<Object>} 待办事项列表，包含 data 数组
 */
export function listTodoItems(status) {
  return api.get('/todo', { params: status ? { status } : {} })
}