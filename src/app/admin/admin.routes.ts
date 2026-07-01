import { Routes } from '@angular/router';
import { Dashboard } from './pages/dashboard/dashboard';
import { AdminLayout } from '@app/admin/layout/admin-layout/admin-layout';
import { Employees } from '@app/admin/pages/employees/employees';
import { History } from '@app/admin/pages/history/history';
import { ConfigLayout } from '@app/admin/layout/config-layout/config-layout';
import { AdminPassword } from '@app/admin/pages/admin-password/admin-password';
import { LocalPassword } from '@app/admin/pages/local-password/local-password';
import { AttendanceManager } from '@app/admin/pages/attendance-manager/attendance-manager';
import { Autostart } from '@app/admin/pages/autostart/autostart';

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
      {
        path: 'attendance-manager',
        component: AttendanceManager,
      },
      {
        path: 'config',
        component: ConfigLayout,
        children: [
          {
            path: 'admin-password',
            component: AdminPassword,
          },
          {
            path: 'local-password',
            component: LocalPassword,
          },
          {
            path: 'autostart',
            component: Autostart,
          },
        ],
      },
    ],
  },
];
