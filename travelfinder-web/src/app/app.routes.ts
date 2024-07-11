import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/menu/menu.page').then( m => m.MenuPage),
    children:[
      {
        path:'home',
        loadComponent: () => import('src/app/pages/home/home.page').then(m => m.HomePage)
      },
      {
        path: 'plan',
        children:[
          {
            path: '**',
            data: { reuse: false },
            loadComponent: () => import('./pages/plan/plan.page').then( m => m.PlanPage)
          }
        ]
      },
    ]

  }
];
