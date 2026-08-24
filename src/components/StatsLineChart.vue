<template>
  <div class="chart-wrapper">
    <h4 class="chart-title">📈 调用趋势（折线图）</h4>
    <div v-if="loading" class="chart-placeholder">加载中...</div>
    <div v-else-if="error" class="chart-placeholder error">
      <p>统计数据加载失败</p>
      <button @click="fetchData" class="btn-retry-sm">重试</button>
    </div>
    <div v-else-if="!hasData" class="chart-placeholder">暂无统计数据</div>
    <div v-else ref="chartRef" class="chart-container"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { getStats } from '../api/index.js'

const loading = ref(true)
const error = ref(null)
const hasData = ref(false)
const chartRef = ref(null)
let chartInstance = null

async function fetchData() {
  loading.value = true
  error.value = null
  try {
    const res = await getStats('time')
    const entries = res.data.entries
    hasData.value = entries && entries.length > 0
    if (hasData.value) {
      await nextTick()
      if (chartRef.value) {
        if (!chartInstance) {
          chartInstance = echarts.init(chartRef.value)
        }
        chartInstance.setOption({
          tooltip: { trigger: 'axis' },
          xAxis: { type: 'category', data: entries.map(e => e.name) },
          yAxis: { type: 'value' },
          series: [{
            type: 'line',
            data: entries.map(e => e.count),
            smooth: true,
            lineStyle: { width: 3 },
            areaStyle: { opacity: 0.1 }
          }]
        })
      }
    }
  } catch (err) {
    error.value = err
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
  window.addEventListener('resize', handleResize)
})
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (chartInstance) chartInstance.dispose()
})

function handleResize() {
  if (chartInstance) chartInstance.resize()
}
</script>

<style scoped>
.chart-wrapper { background: #fff; border-radius: 8px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.chart-title { margin-bottom: 12px; font-size: 15px; color: #555; }
.chart-container { height: 250px; }
.chart-placeholder { height: 250px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #999; }
.chart-placeholder.error { color: #e74c3c; }
.btn-retry-sm { margin-top: 8px; padding: 4px 16px; background: #3498db; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
</style>