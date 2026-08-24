<template>
  <div class="export-area">
    <button @click="handleExport" :disabled="exporting" class="btn-export">
      {{ exporting ? '导出中...' : '📥 导出当前页面数据' }}
    </button>
    <p v-if="exportError" class="export-error">{{ exportError }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { getExportUrl } from '../api/index.js'

const props = defineProps({
  activeTab: { type: String, required: true }
})

const exporting = ref(false)
const exportError = ref(null)

async function handleExport() {
  exporting.value = true
  exportError.value = null
  try {
    const url = getExportUrl(props.activeTab)
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error('导出失败')
    }
    const blob = await response.blob()
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${props.activeTab}_export.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(link.href)
  } catch (err) {
    exportError.value = '导出失败，请稍后重试'
  } finally {
    exporting.value = false
  }
}
</script>

<style scoped>
.export-area { margin: 16px 0; text-align: right; }
.btn-export { padding: 10px 24px; background: #27ae60; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; }
.btn-export:disabled { background: #95a5a6; cursor: not-allowed; }
.export-error { color: #e74c3c; margin-top: 8px; font-size: 13px; }
</style>