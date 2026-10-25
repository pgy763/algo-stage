import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'home', component: () => import('../views/HomeView.vue'), meta: { title: 'AlgoStage · 算法剧场' } },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/AuthView.vue'),
    meta: { title: '登录 · AlgoStage' }
  },
  {
    path: '/works',
    name: 'works',
    component: () => import('../views/WorksView.vue'),
    meta: { title: '我的作品 · AlgoStage' }
  },
  {
    path: '/lab',
    name: 'lab',
    component: () => import('../views/LabView.vue'),
    meta: { title: '代码实验台 · AlgoStage' }
  },
  {
    path: '/algo/:id',
    name: 'algo',
    component: () => import('../views/AlgoView.vue'),
    meta: { title: 'AlgoStage' }
  },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
})

router.afterEach((to) => {
  document.title = to.meta?.title || 'AlgoStage'
})

export default router
