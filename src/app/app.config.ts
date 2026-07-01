import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { providePrimeNG } from 'primeng/config';
import Lara from '@primeuix/themes/lara';
import { DatabaseService } from '@app/shared/service/database';
import { DashboardService } from '@app/admin/service/dashboard-service';

export const appConfig: ApplicationConfig = {
  providers: [
    providePrimeNG({
      theme: {
        preset: Lara,
        options: {
          darkModeSelector: false
        }
      }
    }),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideAppInitializer(async () => {
      const dbService = inject(DatabaseService);
      const dashboardService = inject(DashboardService);
      try {
        console.log('[App Init] Cargando base de datos SQLite en Tauri...');
        // 1. Forzamos a Angular a esperar a que la DB esté lista
        await dbService.initDatabase();
        console.log('[App Init] Base de datos lista.');

        console.log('[App Init] Ejecutando verificación de autocierre...');
        // 2. Corremos la rutina para validar jornadas inconclusas de días pasados
        await dashboardService.runAutoCloseRoutine();
        console.log('[App Init] Inicialización completa con éxito.');
      } catch (error) {
        // Capturamos cualquier fallo para evitar el bloqueo total del hilo de Tauri si algo sale mal
        console.error('[App Init Error] Error crítico durante el arranque:', error);
      }
    })
  ]
};
