<template>
  <div class="tab-content">
    <div v-if="loading" class="state-loading">加载中...</div>
    <div v-else-if="error" class="state-error">
      <p>{{ error.message }}</p>
      <button @click="fetchData" class="btn-retry">重新加载</button>
    </div>
    <div v-else class="result-card">
      <h3>Helloworld 接口返回</h3>
      <p class="result-message">{{ data.message }}</p>
      <p class="result-timestamp">时间戳：{{ data.timestamp }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getHelloWorld, trackEvent } from '../api/index.js'

const loading = ref(true)
const error = ref(null)
const data = ref({})

async function fetchData() {
  loading.value = true
  error.value = null
  try {
    const res = await getHelloWorld()
    data.value = res.data
    trackEvent({ api_name: 'helloworld' }).catch(() => {})
  } catch (err) {
    error.value = err
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)
</script>

<style scoped>
.tab-content { padding: 20px; }
.state-loading { text-align: center; padding: 40px; color: #999; }
.state-error { text-align: center; padding: 40px; color: #e74c3c; }
.state-error p { margin-bottom: 16px; }
.btn-retry { padding: 8px 24px; background: #3498db; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
.result-card { background: #fff; border-radius: 8px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.result-message { font-size: 24px; font-weight: bold; color: #2c3e50; margin: 16px 0; }
.result-timestamp { color: #7f8c8d; font-size: 14px; }
</style>