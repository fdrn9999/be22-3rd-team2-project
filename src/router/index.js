import { createRouter, createWebHistory } from 'vue-router';
import { useKanbanStore } from '../stores/kanbanStore';
import DashboardView from '../components/DashboardView.vue';
import KanbanBoardView from '../components/KanbanBoardView.vue';
import LoginPage from '../components/LoginPage.vue';

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: LoginPage,
    meta: { public: true }
  },
  {
    path: '/',
    name: 'Dashboard',
    component: DashboardView,
  },
  {
    path: '/my-tasks',
    name: 'MyTasks',
    component: DashboardView,
    props: { viewType: 'myTasks' }
  },
  {
    path: '/favorites',
    name: 'Favorites',
    component: DashboardView,
    props: { viewType: 'favorites' }
  },
  {
    path: '/board/:id',
    name: 'Board',
    component: KanbanBoardView,
    props: true
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, from, next) => {
  const store = useKanbanStore();
  
  if (!store.isLoggedIn && !store.isDataLoaded) {
      await store.initialize();
  }

  const isAuthenticated = store.isLoggedIn;
  const isPublic = to.meta.public;

  if (!isAuthenticated && !isPublic) {
    next({ name: 'Login' });
  } else if (isAuthenticated && to.name === 'Login') {
    next({ name: 'Dashboard' });
  } else {
    // Sync store logic with route
    if (to.name === 'Board') {
      store.selectBoard(to.params.id);
    } else {
      store.selectBoard(null);
      if (to.name === 'MyTasks') store.setView('myTasks');
      else if (to.name === 'Favorites') store.setView('favorites');
      else store.setView('dashboard');
    }
    next();
  }
});

export default router;
