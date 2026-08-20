import axios from 'axios';

const client = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

// 请求拦截器：注入演示用调用人身份（X-Caller-* 请求头，对应后端 CallContextResolver 解析）
client.interceptors.request.use((config) => {
  config.headers['X-Caller-Id'] = 'demo-1001';
  config.headers['X-Caller-Name'] = '张三';
  config.headers['X-Caller-Type'] = 'EMPLOYEE';
  config.headers['X-Caller-Level'] = 'P7';
  config.headers['X-Caller-Dept-Code'] = 'DEP-ALGO';
  config.headers['X-Caller-Dept-Name'] = '算法中心';
  return config;
});

client.interceptors.response.use(
  (resp) => resp.data,
  (error) => {
    const msg = error?.response?.data?.msg || error.message || '网络异常';
    return Promise.reject(new Error(msg));
  }
);

export const demoApi = {
  helloworld: (name) => client.post('/demo/helloworld', { name }),
  hash: (text, algorithm) => client.post('/demo/hash', { text, algorithm }),
  bubbleSort: (data, order, optimized) =>
    client.post('/demo/bubble-sort', { data, order, optimized }),
};

export const trackingApi = {
  overview: (params) => client.get('/tracking/overview', { params }),
  stats: (dimension, params) => client.get('/tracking/stats', { params: { dimension, ...params } }),
  trend: (granularity, params) => client.get('/tracking/trend', { params: { granularity, ...params } }),
};

export const exportApi = {
  // 导出走浏览器原生下载，不经过 axios 拦截器
  export: async (params) => {
    const resp = await axios.post('/api/export', params, { responseType: 'blob' });
    const disposition = resp.headers['content-disposition'] || '';
    const match = disposition.match(/filename="?([^";]+)"?/);
    const fileName = match ? match[1] : 'export.csv';
    const url = window.URL.createObjectURL(new Blob([resp.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = decodeURIComponent(fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
