import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { Menu } from 'primeng/menu';

@Component({
  selector: 'app-config-layout',
  imports: [RouterOutlet, Menu],
  templateUrl: './config-layout.html',
})
export class ConfigLayout {
  items: MenuItem[] = [
    {
      label: 'Contraseñas',
      items: [
        {
          label: 'Administrador',
          icon: 'pi pi-lock',
          routerLink: '/admin/config/admin-password',
          routerLinkActiveOptions: { exact: true },
        },
        {
          label: 'Local',
          icon: 'pi pi-desktop',
          routerLink: '/admin/config/local-password',
          routerLinkActiveOptions: { exact: true },
        },
      ],
    },
    {
      label: 'Sistema',
      items: [
        {
          label: 'Inicio Automático',
          icon: 'pi pi-cog',
          routerLink: '/admin/config/autostart',
          routerLinkActiveOptions: { exact: true },
        },
        {
          label: 'Actualizaciones',
          icon: 'pi pi-refresh',
          routerLink: '/admin/config/updater',
          routerLinkActiveOptions: { exact: true },
        },
      ],
    },
  ];
}
