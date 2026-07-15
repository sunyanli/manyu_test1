<template>
  <el-tag v-if="status === 'active'" type="success">在职</el-tag>
  <el-tag v-else-if="status === 'resigned'" type="info">离职</el-tag>
  <el-tag v-else type="warning">{{ status }}</el-tag>
</template>

<script setup lang="ts">
defineProps<{
  status: string
}>()
</script>