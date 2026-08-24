<template>
  <div class="tab-content">
    <div class="input-area">
      <input v-model="arrayInput" placeholder="输入数组，如 3,1,4,1,5" class="text-input" />
      <button @click="fetchData" :disabled="!arrayInput.trim()" class="btn-primary">排序</button>
    </div>
    <div v-if="loading" class="state-loading">排序中...</div>
    <div v-else-if="error" class="state-error">
      <p>{{ error.message }}</p>
      <button @click="fetchData" class="btn-retry">重新排序</button>
    </div>
    <div v-else-if="data.sorted" class="result-card">
      <h3>冒泡排序结果</h3>
      <div class="result-row">
        <span class="label">原始数组：</span>
        <span class="value">[{{ data.original.join(', ') }}]</span>
      </div>
      <div class="result-row">
        <span class="label">排序结果：</span>
        <span class="value sorted-value">[{{ data.sorted.join(', ') }}]</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { postBubbleSort, trackEvent } from '../api/index.js'

const arrayInput = ref('3, 1, 4, 1, 5')
const loading = ref(false)
const error = ref(null)
const data = ref({})

async function fetchData() {
  if (!arrayInput.value.trim()) return
  loading.value = true
  error.value = null
  try {
    const arr = arrayInput.value.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n))
    const res = await postBubbleSort(arr)
    data.value = res.data
    trackEvent({ api_name: 'bubble-sort' }).catch(() => {})
  } catch (err) {
    error.value = err
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.tab-content { padding: 20px; }
.input-area { display: flex; gap: 12px; margin-bottom: 20px; }
.text-input { flex: 1; padding: 10px 16px; border: 1px solid #dcdcdc; border-radius: 4px; font-size: 16px; }
.btn-primary { padding: 10px 24px; background: #3498db; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
.btn-primary:disabled { background: #bdc3c7; cursor: not-allowed; }
.state-loading { text-align: center; padding: 40px; color: #999; }
.state-error { text-align: center; padding: 40px; color: #e74c3c; }
.btn-retry { padding: 8px 24px; background: #3498db; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
.result-card { background: #fff; border-radius: 8px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.result-row { margin: 12px 0; }
.label { font-weight: bold; color: #555; }
.value { color: #2c3e50; }
.sorted-value { color: #27ae60; font-weight: bold; }
</style>