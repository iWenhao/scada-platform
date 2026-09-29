import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/login/index.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      name: 'Dashboard',
      component: () => import('@/views/dashboard/index.vue'),
    },
    {
      path: '/editor',
      name: 'Editor',
      component: () => import('@/views/editor/index.vue'),
      meta: { requiresEdit: true },
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

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  // 会话可能尚未从存储恢复（首次导航）
  if (!auth.isLoggedIn) {
    await auth.restoreSession()
  }

  if (to.meta.public) {
    // 已登录访问登录页则回跳
    if (auth.isLoggedIn && to.path === '/login') {
      return (to.query.redirect as string) || '/'
    }
    return true
  }

  if (!auth.isLoggedIn) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  if (to.meta.requiresEdit && !auth.canEdit) {
    // 无编辑权限时进预览而不是卡死
    return { path: '/preview', query: { project: to.query.project as string | undefined } }
  }

  return true
})

export default router
