<template>
  <el-card shadow="never">
    <template #header>
      <span>W02 哈希算法执行（MD5 / SHA-256 / SM3）</span>
    </template>
    <el-form inline>
      <el-form-item label="待哈希文本">
        <el-input
          v-model="text"
          placeholder="请输入文本（UTF-8 字节 ≤ 4096）"
          style="width: 280px"
          @keyup.enter="run"
        />
      </el-form-item>
      <el-form-item label="算法">
        <el-select v-model="algorithm" style="width: 140px">
          <el-option label="SHA-256" value="SHA256" />
          <el-option label="MD5" value="MD5" />
          <el-option label="SM3" value="SM3" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="loading" @click="run">执行</el-button>
      </el-form-item>
    </el-form>

    <el-alert
      v-if="result"
      type="success"
      :closable="false"
      title="执行成功"
    >
      <div class="meta-line">算法：{{ result.algorithm }}</div>
      <div class="meta-line">哈希值：<code>{{ result.hash }}</code></div>
      <div class="meta-line">输入长度：{{ result.inputLength }} 字节，耗时：{{ result.costTimeMs }} ms</div>
    </el-alert>
  </el-card>
</template>

<script setup>
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { demoApi } from '../api';

const text = ref('');
const algorithm = ref('SHA256');
const loading = ref(false);
const result = ref(null);

const run = async () => {
  loading.value = true;
  try {
    const resp = await demoApi.hash(text.value, algorithm.value);
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
