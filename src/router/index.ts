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
  ],
})

export default router
