import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Dashboard',
      component: () => import('@/views/dashboard/index.vue'),
    },
    {
      path: '/editor',
      name: 'Editor',
      component: () => import('@/views/editor/index.vue'),
    },
    {
      path: '/preview',
      name: 'Preview',
      component: () => import('@/views/preview/index.vue'),
    },
    // 404 兜底: 未知路径回首页
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

export default router
