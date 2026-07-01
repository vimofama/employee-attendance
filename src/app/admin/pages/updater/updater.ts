import { Component, OnInit, signal } from '@angular/core';
import { getVersion } from '@tauri-apps/api/app';
import { check } from '@tauri-apps/plugin-updater';
import { ask, message } from '@tauri-apps/plugin-dialog';
import { relaunch } from '@tauri-apps/plugin-process';
import { Button } from 'primeng/button';
import { ProgressBar } from 'primeng/progressbar';

@Component({
  selector: 'app-updater',
  imports: [Button, ProgressBar],
  templateUrl: './updater.html',
})
export class Updater implements OnInit {
  currentVersion = signal<string>('0.0.0');
  checking = signal<boolean>(false);
  downloading = signal<boolean>(false);
  downloadProgress = signal<number>(0);

  async ngOnInit() {
    try {
      const version = await getVersion();
      this.currentVersion.set(version);
    } catch (err) {
      console.error('Error al obtener la versión local:', err);
    }
  }

  /**
   * Ejecuta la comprobación de actualizaciones interactuando con los diálogos del S.O.
   * @param onUserClick Define si fue disparado manualmente por el botón para mostrar el mensaje de "Al día"
   */
  async checkForUpdates(onUserClick: boolean = false) {
    try {
      this.checking.set(true);
      const update = await check();
      this.checking.set(false); // Apagamos el estado de carga del botón

      // 1. Caso: El servidor no responde o el plugin falla
      if (update === null) {
        await message(
          'No se pudo verificar la existencia de actualizaciones.\nPor favor, inténtalo más tarde.',
          {
            title: 'Error de Conexión',
            kind: 'error',
            okLabel: 'Entendido',
          },
        );
        return;
      }

      // 2. Caso: Hay una actualización disponible
      if (update.available) {
        const releaseNotes = update.body ? `\n\nNotas de la versión:\n${update.body}` : '';

        // Lanzamos el diálogo nativo de confirmación (SÍ/NO)
        const s_update = await ask(
          `¡Una nueva versión (v${update.version}) está disponible!${releaseNotes}\n\n¿Deseas descargar e instalar la actualización ahora?`,
          {
            title: 'Actualización Disponible',
            kind: 'info',
            okLabel: 'Actualizar',
            cancelLabel: 'Más tarde',
          },
        );

        // Si el usuario acepta, procedemos con la descarga inline
        if (s_update) {
          await this.executeDownloadAndInstall(update);
        }
      }
      // 3. Caso: El usuario buscó manualmente pero ya está en la última versión
      else if (onUserClick) {
        await message('Ya te encuentras en la última versión estable del sistema. ¡Buen trabajo!', {
          title: 'Sistema al Día',
          kind: 'info',
          okLabel: 'Excelente',
        });
      }
    } catch (err) {
      this.checking.set(false);
      await message('Ocurrió un error inesperado al procesar la actualización.', {
        title: 'Error Crítico',
        kind: 'error',
        okLabel: 'Cerrar',
      });
      console.error(err);
    }
  }

  /**
   * Maneja el proceso de descarga e instalación mostrando el progreso en la interfaz gráfica
   */
  private async executeDownloadAndInstall(update: any) {
    try {
      this.downloading.set(true);
      this.downloadProgress.set(0);

      let downloaded = 0;
      let contentLength = 0;

      await update.downloadAndInstall((event: any) => {
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength || 0;
            break;
          case 'Progress':
            downloaded += event.data.chunkLength;
            if (contentLength > 0) {
              const percentage = Math.round((downloaded / contentLength) * 100);
              this.downloadProgress.set(percentage);
            }
            break;
          case 'Finished':
            this.downloadProgress.set(100);
            break;
        }
      });

      // Notificación nativa de éxito antes del reinicio
      await message(
        'La actualización ha sido instalada de forma exitosa.\nLa aplicación se reiniciará automáticamente.',
        {
          title: 'Instalación Completada',
          kind: 'info',
          okLabel: 'Reiniciar',
        },
      );

      // Forzamos el reinicio inmediato a través del plugin de procesos de Tauri
      await relaunch();
    } catch (err) {
      this.downloading.set(false);
      await message('Fallo la descarga o escritura de los paquetes del sistema.', {
        title: 'Error de Instalación',
        kind: 'error',
        okLabel: 'OK',
      });
      console.error(err);
    }
  }
}
