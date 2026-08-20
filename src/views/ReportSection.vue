<template>
  <el-card shadow="never">
    <div class="toolbar">
      <el-radio-group v-model="dimension" @change="loadStats">
        <el-radio-button value="CALLER_TYPE">人员类型</el-radio-button>
        <el-radio-button value="CALLER_LEVEL">人员层级</el-radio-button>
        <el-radio-button value="CALLER_DEPT">人员部门</el-radio-button>
        <el-radio-button value="BIZ_TYPE">业务类型</el-radio-button>
      </el-radio-group>
      <el-button link type="primary" :loading="loading" @click="loadAll">刷新</el-button>
    </div>

    <el-row :gutter="12" class="cards">
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="card-label">总调用次数</div>
          <div class="card-value">{{ overview.totalCalls }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="card-label">调用人数</div>
          <div class="card-value">{{ overview.totalCallers }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="card-label">成功率</div>
          <div class="card-value">{{ overview.successRate }}%</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="card-label">调用最多的人</div>
          <div class="card-value">{{ overview.topCaller?.name }}（{{ overview.topCaller?.calls }} 次）</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="12">
      <el-col :span="12">
        <div class="chart-box">
          <h4>调用趋势（折线图）</h4>
          <div ref="lineRef" class="chart"></div>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="chart-box">
          <h4>{{ dimensionLabel }}分布（饼图）</h4>
          <div ref="pieRef" class="chart"></div>
        </div>
      </el-col>
    </el-row>
    <el-row>
      <el-col :span="24">
        <div class="chart-box">
          <h4>{{ dimensionLabel }}分布（柱状图）</h4>
          <div ref="barRef" class="chart"></div>
        </div>
      </el-col>
    </el-row>
  </el-card>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import * as echarts from 'echarts';
import { trackingApi } from '../api';

const dimension = ref('CALLER_TYPE');
const overview = ref({});

const dimensionOptions = {
  CALLER_TYPE: '人员类型',
  CALLER_LEVEL: '人员层级',
  CALLER_DEPT: '人员部门',
  BIZ_TYPE: '业务类型',
};
const dimensionLabel = computed(() => dimensionOptions[dimension.value]);

const lineRef = ref(null);
const pieRef = ref(null);
const barRef = ref(null);
let lineChart = null;
let pieChart = null;
let barChart = null;
const loading = ref(false);

const renderLine = (trend) => {
  if (!lineChart && lineRef.value) lineChart = echarts.init(lineRef.value);
  lineChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['调用次数', '成功率(%)'] },
    xAxis: { type: 'category', data: trend.map((p) => p.time) },
    yAxis: [
      { type: 'value', name: '调用次数' },
      { type: 'value', name: '成功率(%)', max: 100 },
    ],
    series: [
      {
        name: '调用次数',
        type: 'line',
        smooth: true,
        data: trend.map((p) => p.calls),
      },
      {
        name: '成功率(%)',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        data: trend.map((p) => Number(p.successRate)),
      },
    ],
  });
};

const renderPie = (stats) => {
  if (!pieChart && pieRef.value) pieChart = echarts.init(pieRef.value);
  pieChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    series: [
      {
        type: 'pie',
        radius: ['35%', '65%'],
        data: stats.map((item) => ({ name: item.name, value: item.value })),
        label: { formatter: '{b}: {c}' },
      },
    ],
  });
};

const renderBar = (stats) => {
  if (!barChart && barRef.value) barChart = echarts.init(barRef.value);
  barChart.setOption({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: stats.map((item) => item.name) },
    yAxis: { type: 'value' },
    series: [
      {
        type: 'bar',
        barWidth: '45%',
        data: stats.map((item) => item.value),
      },
    ],
  });
};

const loadStats = async () => {
  try {
    const resp = await trackingApi.stats(dimension.value, {});
    renderPie(resp.data.items || []);
    renderBar(resp.data.items || []);
  } catch (e) {
    console.error(e);
  }
};

const loadAll = async () => {
  loading.value = true;
  try {
    const [ov, stats, trend] = await Promise.all([
      trackingApi.overview({}),
      trackingApi.stats(dimension.value, {}),
      trackingApi.trend('DAY', {}),
    ]);
    overview.value = ov.data;
    renderPie(stats.data.items || []);
    renderBar(stats.data.items || []);
    renderLine(trend.data.points || []);
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
};

const resize = () => {
  lineChart?.resize();
  pieChart?.resize();
  barChart?.resize();
};

onMounted(async () => {
  await nextTick();
  window.addEventListener('resize', resize);
  await loadAll();
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', resize);
  lineChart?.dispose();
  pieChart?.dispose();
  barChart?.dispose();
});
</script>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.cards {
  margin-bottom: 16px;
}
.card-label {
  font-size: 13px;
  color: #888;
}
.card-value {
  font-size: 22px;
  font-weight: 600;
  margin-top: 4px;
}
.chart-box {
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 8px;
  margin-bottom: 12px;
}
.chart {
  width: 100%;
  height: 300px;
}
</style>
