import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/',
    name: 'Layout',
    component: () => import('@/views/Layout.vue'),
    meta: { requiresAuth: true },
    redirect: '/employees',
    children: [
      {
        path: 'employees',
        name: 'EmployeeList',
        component: () => import('@/views/EmployeeList.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'employees/new',
        name: 'EmployeeCreate',
        component: () => import('@/views/EmployeeForm.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'employees/:id',
        name: 'EmployeeDetail',
        component: () => import('@/views/EmployeeDetail.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'employees/:id/edit',
        name: 'EmployeeEdit',
        component: () => import('@/views/EmployeeForm.vue'),
        meta: { requiresAuth: true },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 路由守卫
router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('token')

  if (to.path === '/login') {
    // 已登录用户访问 /login 则跳转到 /
    if (token) {
      next('/')
    } else {
      next()
    }
  } else {
    // 需要认证的页面，检查 token
    if (to.meta.requiresAuth && !token) {
      next('/login')
    } else {
      next()
    }
  }
})

export default router