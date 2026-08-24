<template>
  <div class="tab-content">
    <div class="input-area">
      <input v-model="inputText" placeholder="输入要计算哈希的文本" class="text-input" />
      <button @click="fetchData" :disabled="!inputText.trim()" class="btn-primary">计算哈希</button>
    </div>
    <div v-if="loading" class="state-loading">计算中...</div>
    <div v-else-if="error" class="state-error">
      <p>{{ error.message }}</p>
      <button @click="fetchData" class="btn-retry">重新计算</button>
    </div>
    <div v-else-if="data.hash" class="result-card">
      <h3>SHA256 哈希结果</h3>
      <div class="result-row">
        <span class="label">输入：</span>
        <span class="value">{{ data.input }}</span>
      </div>
      <div class="result-row">
        <span class="label">算法：</span>
        <span class="value">{{ data.algorithm }}</span>
      </div>
      <div class="result-row">
        <span class="label">哈希值：</span>
        <span class="value hash-value">{{ data.hash }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getHash, trackEvent } from '../api/index.js'

const inputText = ref('Hello World')
const loading = ref(false)
const error = ref(null)
const data = ref({})

async function fetchData() {
  if (!inputText.value.trim()) return
  loading.value = true
  error.value = null
  try {
    const res = await getHash(inputText.value)
    data.value = res.data
    trackEvent({ api_name: 'hash' }).catch(() => {})
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
.hash-value { font-family: monospace; word-break: break-all; background: #f8f9fa; padding: 8px; border-radius: 4px; display: inline-block; }
</style>