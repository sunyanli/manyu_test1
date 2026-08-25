<template>
  <div class="tool-page">
    <h1 class="page-title">Tool Platform</h1>

    <!-- Tab 导航 -->
    <div class="tab-nav">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        :class="['tab-btn', { active: activeTab === tab.key }]"
        @click="switchTab(tab.key)"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Tab 内容 -->
    <div class="tab-content">
      <HelloWorldTab
        v-if="activeTab === 'helloworld'"
        @update:result="(data) => onResultUpdate('helloworld', data)"
      />
      <HashTab
        v-if="activeTab === 'hash'"
        @update:result="(data) => onResultUpdate('hash', data)"
      />
      <BubbleSortTab
        v-if="activeTab === 'bubble_sort'"
        @update:result="(data) => onResultUpdate('bubble_sort', data)"
      />
    </div>

    <!-- 导出按钮 -->
    <div class="export-bar">
      <button class="export-btn" :disabled="!tabData[activeTab]" @click="onExport">
        📥 导出当前结果
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import HelloWorldTab from '../components/HelloWorldTab.vue'
import HashTab from '../components/HashTab.vue'
import BubbleSortTab from '../components/BubbleSortTab.vue'
import { postExport } from '../api/index.js'

const tabs = [
  { key: 'helloworld', label: 'Hello World' },
  { key: 'hash', label: '哈希计算' },
  { key: 'bubble_sort', label: '冒泡排序' },
]

const activeTab = ref('helloworld')
const tabData = reactive({
  helloworld: null,
  hash: null,
  bubble_sort: null,
})

function switchTab(key) {
  activeTab.value = key
}

function onResultUpdate(tab, data) {
  tabData[tab] = data
}

async function onExport() {
  const data = tabData[activeTab.value]
  if (!data) return

  try {
    const response = await postExport(activeTab.value, data)
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `export_${activeTab.value}.json`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch (err) {
    alert('导出失败：' + (err.response?.data?.detail || err.message))
  }
}
</script>

<style scoped>
.tool-page {
  max-width: 720px;
  margin: 40px auto;
  padding: 0 20px;
}
.page-title {
  text-align: center;
  margin-bottom: 24px;
  font-size: 24px;
  color: #1a1a2e;
}
.tab-nav {
  display: flex;
  gap: 0;
  border-bottom: 2px solid #e0e0e0;
  margin-bottom: 24px;
}
.tab-btn {
  flex: 1;
  padding: 12px 0;
  border: none;
  background: none;
  font-size: 15px;
  color: #666;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: color 0.2s, border-color 0.2s;
}
.tab-btn:hover {
  color: #333;
}
.tab-btn.active {
  color: #409eff;
  border-bottom-color: #409eff;
  font-weight: 600;
}
.tab-content {
  min-height: 280px;
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
.export-bar {
  text-align: center;
  margin-top: 20px;
}
.export-btn {
  padding: 10px 32px;
  font-size: 15px;
  background: #409eff;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}
.export-btn:hover:not(:disabled) {
  background: #337ecc;
}
.export-btn:disabled {
  background: #bbb;
  cursor: not-allowed;
}
</style>