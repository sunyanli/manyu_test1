import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8000',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

export const getHelloWorld = () => api.get('/api/helloworld')

export const postHash = (text, algorithm) =>
  api.post('/api/hash', { text, algorithm })

export const postBubbleSort = (array, order) =>
  api.post('/api/bubble_sort', { array, order })

export const postExport = (tab, data) =>
  api.post('/api/export', { tab, data }, { responseType: 'blob' })