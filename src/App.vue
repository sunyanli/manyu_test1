<template>
  <div class="app-container">
    <header class="app-header">
      <h1>三接口演示系统</h1>
      <p class="subtitle">Helloworld · 哈希算法 · 冒泡排序</p>
    </header>

    <!-- Tab 导航 -->
    <div class="tab-nav">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        :class="['tab-btn', { active: activeTab === tab.key }]"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Tab 内容区 -->
    <div class="tab-content-area">
      <KeepAlive>
        <component :is="currentTabComponent" />
      </KeepAlive>
    </div>

    <!-- 导出按钮 -->
    <ExportButton :activeTab="activeTab" />

    <!-- 统计报表面板 -->
    <section class="stats-section">
      <h2 class="section-title">📊 调用统计报表</h2>
      <div class="charts-grid">
        <StatsLineChart />
        <StatsPieChart />
        <StatsBarChart />
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import TabHelloWorld from './components/TabHelloWorld.vue'
import TabHash from './components/TabHash.vue'
import TabBubbleSort from './components/TabBubbleSort.vue'
import ExportButton from './components/ExportButton.vue'
import StatsLineChart from './components/StatsLineChart.vue'
import StatsPieChart from './components/StatsPieChart.vue'
import StatsBarChart from './components/StatsBarChart.vue'

const activeTab = ref('helloworld')
const tabs = [
  { key: 'helloworld', label: 'Helloworld' },
  { key: 'hash', label: '哈希算法' },
  { key: 'bubble-sort', label: '冒泡排序' }
]

const tabComponents = {
  helloworld: TabHelloWorld,
  hash: TabHash,
  'bubble-sort': TabBubbleSort
}

const currentTabComponent = computed(() => tabComponents[activeTab.value])
</script>

<style scoped>
.app-container { max-width: 1100px; margin: 0 auto; }
.app-header { text-align: center; padding: 32px 0 20px; }
.app-header h1 { font-size: 28px; color: #2c3e50; }
.subtitle { color: #7f8c8d; margin-top: 8px; }
.tab-nav { display: flex; gap: 4px; border-bottom: 2px solid #e0e0e0; margin-bottom: 0; }
.tab-btn { padding: 12px 28px; background: none; border: none; border-bottom: 2px solid transparent; margin-bottom: -2px; cursor: pointer; font-size: 15px; color: #666; transition: all 0.2s; }
.tab-btn:hover { color: #3498db; }
.tab-btn.active { color: #3498db; border-bottom-color: #3498db; font-weight: bold; }
.tab-content-area { background: #fff; border-radius: 0 0 8px 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); min-height: 200px; }
.stats-section { margin-top: 32px; }
.section-title { font-size: 20px; margin-bottom: 16px; color: #2c3e50; }
.charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; }
</style>