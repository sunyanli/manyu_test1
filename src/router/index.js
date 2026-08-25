import { createRouter, createWebHistory } from 'vue-router'
import ToolPage from '../views/ToolPage.vue'

const routes = [
  { path: '/', name: 'home', component: ToolPage },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})