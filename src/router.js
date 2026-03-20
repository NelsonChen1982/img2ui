import { createRouter, createWebHistory } from 'vue-router'

const WizardView = () => import('./views/WizardView.vue')
const GalleryList = () => import('./views/GalleryList.vue')
const GalleryDetail = () => import('./views/GalleryDetail.vue')
const MyDesigns = () => import('./views/MyDesigns.vue')

const routes = [
  { path: '/', name: 'wizard', component: WizardView },
  { path: '/gallery', name: 'gallery', component: GalleryList },
  { path: '/gallery/:id', name: 'gallery-detail', component: GalleryDetail, props: true },
  { path: '/my-designs', name: 'my-designs', component: MyDesigns },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
