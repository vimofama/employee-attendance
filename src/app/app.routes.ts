import { Routes } from '@angular/router';
import { roleGuard } from '@app/auth/guard/role-guard';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./auth/auth.routes').then((m) => m.routes),
  },
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.routes').then((m) => m.routes),
    canActivate: [roleGuard],
    data: {roles: ['admin']}
  },
  {
    path: 'local',
    loadChildren: () => import('./attendance/attendance.routes').then((m) => m.routes),
    canActivate: [roleGuard],
    data: {roles: ['admin', 'local']}
  },
  {
    path: '**',
    redirectTo: '',
  },
];
