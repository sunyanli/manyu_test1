<template>
  <el-card shadow="never">
    <template #header>
      <span>W03 冒泡排序执行（标准版 / 优化版 / 降序）</span>
    </template>
    <el-form inline>
      <el-form-item label="数值数组">
        <el-input
          v-model="rawData"
          placeholder="逗号分隔，如 5,3,8,4,2（1~10000 个）"
          style="width: 320px"
          @keyup.enter="run"
        />
      </el-form-item>
      <el-form-item label="方向">
        <el-select v-model="order" style="width: 100px">
          <el-option label="升序" value="ASC" />
          <el-option label="降序" value="DESC" />
        </el-select>
      </el-form-item>
      <el-form-item label="优化版">
        <el-switch v-model="optimized" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="loading" @click="run">执行</el-button>
      </el-form-item>
    </el-form>

    <el-alert
      v-if="result"
      type="success"
      :closable="false"
      :title="`算法版本：${result.algorithmVersion}`"
    >
      <div class="meta-line">原始大小：{{ result.originalSize }}，交换次数：{{ result.swaps }}，耗时：{{ result.costTimeMs }} ms</div>
      <div class="meta-line">排序结果（前 100）：{{ result.sorted.join(', ') }}</div>
    </el-alert>
  </el-card>
</template>

<script setup>
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { demoApi } from '../api';

const rawData = ref('5,3,8,4,2');
const order = ref('ASC');
const optimized = ref(true);
const loading = ref(false);
const result = ref(null);

const run = async () => {
  const data = rawData.value
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => !Number.isNaN(n));
  if (data.length === 0) {
    ElMessage.warning('请输入有效的数值数组');
    return;
  }
  loading.value = true;
  try {
    const resp = await demoApi.bubbleSort(data, order.value, optimized.value);
    result.value = resp.data;
  } catch (e) {
    ElMessage.error(e.message);
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.meta-line {
  margin-top: 4px;
  font-size: 13px;
  color: #666;
  word-break: break-all;
}
</style>
