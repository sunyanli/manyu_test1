import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'

const request = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

// 请求拦截器
request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  (response: AxiosResponse) => {
    return response.data
  },
  (error: AxiosError) => {
    const status = error.response?.status
    const data = error.response?.data as any

    switch (status) {
      case 401:
        localStorage.removeItem('token')
        localStorage.removeItem('username')
        ElMessage.error('登录已过期，请重新登录')
        window.location.href = '/login'
        break
      case 409:
        // 乐观锁冲突，返回错误信息供调用方处理
        ElMessage.warning(data?.message || '数据已被他人修改，请刷新后重试')
        break
      case 400:
        ElMessage.error(data?.message || '请求参数错误')
        break
      default:
        ElMessage.error(data?.message || `请求失败 (${status || '未知错误'})`)
        break
    }

    return Promise.reject(error)
  }
)

export default request