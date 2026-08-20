<template>
  <div class="page-container">
    <header class="page-header">
      <h1>三示例接口演示控制台</h1>
      <div class="header-right">
        <el-select v-model="exportTarget" style="width: 180px" placeholder="导出目标">
          <el-option label="helloworld 页面" value="HELLO_WORLD" />
          <el-option label="哈希算法页面" value="HASH" />
          <el-option label="冒泡排序页面" value="BUBBLE_SORT" />
          <el-option label="统计报表" value="REPORT" />
        </el-select>
        <el-button type="primary" :loading="exporting" @click="handleExport">
          <el-icon><Download /></el-icon>&nbsp;导出当前页面结果
        </el-button>
      </div>
    </header>

    <el-tabs v-model="activeTab" type="border-card">
      <el-tab-pane label="helloworld" name="helloworld">
        <HelloWorldTab />
      </el-tab-pane>
      <el-tab-pane label="哈希算法" name="hash">
        <HashTab />
      </el-tab-pane>
      <el-tab-pane label="冒泡排序" name="bubbleSort">
        <BubbleSortTab />
      </el-tab-pane>
    </el-tabs>

    <section class="report-section">
      <h2>调用情况报表（埋点统计）</h2>
      <ReportSection />
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import HelloWorldTab from './views/HelloWorldTab.vue';
import HashTab from './views/HashTab.vue';
import BubbleSortTab from './views/BubbleSortTab.vue';
import ReportSection from './views/ReportSection.vue';
import { exportApi } from './api';

const activeTab = ref('helloworld');
const exportTarget = ref('HELLO_WORLD');
const exporting = ref(false);

const handleExport = async () => {
  exporting.value = true;
  try {
    await exportApi.export({ target: exportTarget.value, format: 'CSV' });
    ElMessage.success('导出成功');
  } catch (e) {
    ElMessage.error(`导出失败：${e.message}`);
  } finally {
    exporting.value = false;
  }
};
</script>

<style scoped>
.page-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.header-right {
  display: flex;
  gap: 8px;
  align-items: center;
}
.report-section {
  margin-top: 20px;
}
</style>
