import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    component: () => import('@/views/Layout.vue'),
    meta: { requiresAuth: true },
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/EmployeeList.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'employee/new',
        name: 'EmployeeCreate',
        component: () => import('@/views/EmployeeForm.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'employee/:id',
        name: 'EmployeeDetail',
        component: () => import('@/views/EmployeeDetail.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'employee/:id/edit',
        name: 'EmployeeEdit',
        component: () => import('@/views/EmployeeForm.vue'),
        meta: { requiresAuth: true }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('token')
  if (to.meta.requiresAuth !== false && !token) {
    next('/login')
  } else if (to.path === '/login' && token) {
    next('/')
  } else {
    next()
  }
})

export default router