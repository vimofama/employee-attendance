import { Routes } from '@angular/router';
import { Dashboard } from './pages/dashboard/dashboard';
import { AdminLayout } from '@app/admin/layout/admin-layout/admin-layout';
import { Employees } from '@app/admin/pages/employees/employees';
import { History } from '@app/admin/pages/history/history';

export const routes: Routes = [
  {
    path: '',
    component: AdminLayout,
    children: [
      {
        path: '',
        component: Dashboard,
      },
      {
        path: 'employees',
        component: Employees,
      },
      {
        path: 'history',
        component: History,
      },
    ],
  },
];
