<template>
  <div class="bubblesort-tab">
    <h3>冒泡排序</h3>
    <p class="desc">输入逗号分隔的整数数组，选择排序方向。</p>

    <div class="form-group">
      <label>输入数组（逗号分隔）：</label>
      <input
        v-model="arrayInput"
        type="text"
        placeholder="例如：5, 3, 8, 4, 2"
        :disabled="loading"
      />
    </div>

    <div class="form-group">
      <label>排序方向：</label>
      <select v-model="order" :disabled="loading">
        <option value="asc">升序 (asc)</option>
        <option value="desc">降序 (desc)</option>
      </select>
    </div>

    <div v-if="inputError" class="input-error">{{ inputError }}</div>

    <button class="exec-btn" :disabled="loading || !arrayInput.trim()" @click="execute">
      {{ loading ? '请求中...' : '▶ 执行' }}
    </button>

    <div v-if="result" class="result-box">
      <div class="result-label">结果：</div>
      <div class="result-item"><span>原始：</span>[{{ result.original.join(', ') }}]</div>
      <div class="result-item"><span>排序：</span>[{{ result.sorted.join(', ') }}]</div>
      <div class="result-item"><span>方向：</span>{{ result.order }}</div>
    </div>

    <div v-if="error" class="error-box">{{ error }}</div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { postBubbleSort } from '../api/index.js'

const emit = defineEmits(['update:result'])

const arrayInput = ref('')
const order = ref('asc')
const result = ref(null)
const loading = ref(false)
const error = ref('')
const inputError = ref('')

function parseArray(input) {
  const trimmed = input.trim()
  if (!trimmed) return null
  const parts = trimmed.split(',').map(s => s.trim())
  const nums = []
  for (const p of parts) {
    if (p === '') continue
    const n = parseInt(p, 10)
    if (isNaN(n)) return null
    nums.push(n)
  }
  return nums
}

async function execute() {
  inputError.value = ''
  const array = parseArray(arrayInput.value)
  if (array === null) {
    inputError.value = '输入格式错误：请输入逗号分隔的整数，例如 5, 3, 8'
    return
  }
  if (array.length === 0) {
    inputError.value = '请输入至少一个整数'
    return
  }

  loading.value = true
  error.value = ''
  try {
    const res = await postBubbleSort(array, order.value)
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
.bubblesort-tab h3 { font-size: 18px; margin-bottom: 8px; }
.desc { color: #888; font-size: 14px; margin-bottom: 16px; }
.form-group { margin-bottom: 12px; }
.form-group label { display: block; font-weight: 600; margin-bottom: 4px; font-size: 14px; }
.form-group input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
}
.form-group select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  background: #fff;
}
.input-error {
  color: #e74c3c;
  font-size: 13px;
  margin-bottom: 8px;
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
.error-box {
  margin-top: 12px;
  color: #e74c3c;
  background: #fdecea;
  padding: 10px;
  border-radius: 6px;
  font-size: 14px;
}
</style>