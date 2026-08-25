<template>
  <div class="hash-tab">
    <h3>哈希计算</h3>
    <p class="desc">输入文本并选择算法，计算哈希摘要。</p>

    <div class="form-group">
      <label>输入文本：</label>
      <textarea v-model="text" rows="3" placeholder="请输入待哈希的文本..." :disabled="loading"></textarea>
    </div>

    <div class="form-group">
      <label>算法：</label>
      <select v-model="algorithm" :disabled="loading">
        <option value="sha256">SHA-256</option>
        <option value="md5">MD5</option>
      </select>
    </div>

    <button class="exec-btn" :disabled="loading || !text.trim()" @click="execute">
      {{ loading ? '请求中...' : '▶ 执行' }}
    </button>

    <div v-if="result" class="result-box">
      <div class="result-label">结果：</div>
      <div class="result-item"><span>算法：</span>{{ result.algorithm }}</div>
      <div class="result-item"><span>输入：</span>{{ result.input }}</div>
      <div class="result-item"><span>哈希：</span><code>{{ result.hash }}</code></div>
    </div>

    <div v-if="error" class="error-box">{{ error }}</div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { postHash } from '../api/index.js'

const emit = defineEmits(['update:result'])

const text = ref('')
const algorithm = ref('sha256')
const result = ref(null)
const loading = ref(false)
const error = ref('')

async function execute() {
  if (!text.value.trim()) return
  loading.value = true
  error.value = ''
  try {
    const res = await postHash(text.value, algorithm.value)
    result.value = res.data
    emit('update:result', res.data)
  } catch (err) {
    error.value = err.response?.data?.detail
      ? '校验失败：' + JSON.stringify(err.response.data.detail)
      : '无法连接到服务器，请确认后端已启动'
    result.value = null
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.hash-tab h3 { font-size: 18px; margin-bottom: 8px; }
.desc { color: #888; font-size: 14px; margin-bottom: 16px; }
.form-group { margin-bottom: 12px; }
.form-group label { display: block; font-weight: 600; margin-bottom: 4px; font-size: 14px; }
.form-group textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  resize: vertical;
  font-family: inherit;
}
.form-group select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  background: #fff;
}
.exec-btn {
  padding: 8px 24px;
  font-size: 14px;
  background: #409eff;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  margin: 8px 0 16px;
}
.exec-btn:disabled { background: #bbb; cursor: not-allowed; }
.result-box { margin-top: 12px; }
.result-label { font-weight: 600; margin-bottom: 6px; }
.result-item { margin-bottom: 4px; font-size: 14px; }
.result-item span { font-weight: 600; }
.result-item code {
  background: #f0f5ff;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
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