<template>
  <el-card shadow="never">
    <template #header>
      <span>W01 helloworld 执行</span>
    </template>
    <el-form inline>
      <el-form-item label="问候对象">
        <el-input
          v-model="name"
          placeholder="默认 World，长度 ≤ 64"
          maxlength="64"
          style="width: 240px"
          @keyup.enter="run"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="loading" @click="run">执行</el-button>
      </el-form-item>
    </el-form>

    <el-alert
      v-if="result"
      type="success"
      :closable="false"
      :title="`结果：${result.message}`"
    >
      <div class="meta-line">serverTime：{{ result.serverTime }}</div>
      <div class="meta-line">requestId：{{ result.requestId }}</div>
      <div class="meta-line">耗时：{{ result.costTimeMs }} ms</div>
    </el-alert>
  </el-card>
</template>

<script setup>
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { demoApi } from '../api';

const name = ref('');
const loading = ref(false);
const result = ref(null);

const run = async () => {
  loading.value = true;
  try {
    const resp = await demoApi.helloworld(name.value);
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
}
</style>
