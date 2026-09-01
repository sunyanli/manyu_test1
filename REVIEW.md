# manyu_test1 前端项目 Review Profile

## 项目描述
前端单页面应用，3个Tab展示接口执行结果，支持导出和 ECharts 可视化报表。

## 技术栈
- 原生 HTML5 + CSS3 + JavaScript (ES6)
- ECharts 5.x (CDN 引入)

## 项目特定检查门禁
1. **Tab 交互**：三个 Tab 可切换，分别展示 HelloWorld、哈希算法、冒泡排序结果
2. **用户信息**：页面顶部有调用人、人员类型、层级、部门输入
3. **API 调用**：前端正确解析后端 `{code, msg, data}` 包裹格式
4. **导出功能**：两种导出方式（埋点 CSV + 当前结果 CSV）
5. **图表展示**：折线图、饼图、柱状图，支持维度切换
6. **跨域通信**：前端调用 `http://localhost:5000` 后端 API