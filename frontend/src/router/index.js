import { createRouter, createWebHistory } from 'vue-router'

import Login from '../pages/Login.vue'
import Register from '../pages/Register.vue'
import Dashboard from '../pages/Dashboard.vue'


const routes = [
  { path: '/', name: 'Home', component: Dashboard, meta: { requiresAuth: true } },
  { path: '/login', name: 'Login', component: Login },
  { path: '/register', name: 'Register', component: Register },
]


const router = createRouter({
  history: createWebHistory(),
  routes,
})

import { getToken } from '../utils/auth'
// Navigation guard for route protection
router.beforeEach((to, from, next) => {
  const isAuthenticated = !!getToken()
  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ path: '/login', query: { redirect: to.fullPath } })
  } else if ((to.path === '/login' || to.path === '/register') && isAuthenticated) {
    next('/')
  } else {
    next()
  }
})

export default router
