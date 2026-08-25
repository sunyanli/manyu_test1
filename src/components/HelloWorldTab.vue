<template>
  <div class="helloworld-tab">
    <h3>Hello World</h3>
    <p class="desc">点击执行按钮，获取服务端问候消息。</p>

    <button class="exec-btn" :disabled="loading" @click="execute">
      {{ loading ? '请求中...' : '▶ 执行' }}
    </button>

    <div v-if="result" class="result-box">
      <div class="result-label">结果：</div>
      <pre class="result-text">{{ result.message }}</pre>
    </div>

    <div v-if="error" class="error-box">{{ error }}</div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { getHelloWorld } from '../api/index.js'

const emit = defineEmits(['update:result'])

const result = ref(null)
const loading = ref(false)
const error = ref('')

async function execute() {
  loading.value = true
  error.value = ''
  try {
    const res = await getHelloWorld()
    result.value = res.data
    emit('update:result', res.data)
  } catch (err) {
    error.value = '无法连接到服务器，请确认后端已启动'
    result.value = null
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.helloworld-tab h3 { font-size: 18px; margin-bottom: 8px; }
.desc { color: #888; font-size: 14px; margin-bottom: 16px; }
.exec-btn {
  padding: 8px 24px;
  font-size: 14px;
  background: #409eff;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 16px;
}
.exec-btn:disabled { background: #bbb; cursor: not-allowed; }
.result-box { margin-top: 12px; }
.result-label { font-weight: 600; margin-bottom: 6px; }
.result-text {
  background: #f0f5ff;
  padding: 12px;
  border-radius: 6px;
  font-size: 14px;
  white-space: pre-wrap;
  word-break: break-all;
}
.error-box {
  margin-top: 12px;
  color: #e74c3c;
  background: #fdecea;
  padding: 10px;
  border-radius: 6px;
  font-size: 14px;
}
</style>