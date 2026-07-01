import { Component, inject, OnInit, signal } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { FormsModule } from '@angular/forms';
import { enable, isEnabled, disable } from '@tauri-apps/plugin-autostart';

@Component({
  selector: 'app-autostart',
  imports: [Toast, ToggleSwitch, FormsModule],
  templateUrl: './autostart.html',
  providers: [MessageService],
})
export class Autostart implements OnInit {
  private readonly messageService = inject(MessageService);

  // Signal para controlar el estado del switch
  isAutostartEnabled = signal<boolean>(false);
  loading = signal<boolean>(true);

  async ngOnInit() {
    await this.checkAutostartStatus();
  }

  /**
   * Consulta a Tauri si la aplicación ya está registrada en el inicio del S.O.
   */
  async checkAutostartStatus() {
    try {
      this.loading.set(true);
      const state = await isEnabled();
      this.isAutostartEnabled.set(state);
    } catch (err) {
      console.error('Error al consultar plugin autostart:', err);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Escucha los cambios del ToggleSwitch e invoca el comando nativo de Tauri
   */
  async onToggleChange(newValue: boolean) {
    try {
      if (newValue) {
        await enable();
        this.showToast(
          'success',
          'Activado',
          'La aplicación se iniciará automáticamente con el sistema.',
        );
      } else {
        await disable();
        this.showToast('info', 'Desactivado', 'Se removió la aplicación del inicio automático.');
      }
      this.isAutostartEnabled.set(newValue);
    } catch (err) {
      // Revertimos el estado visual si Tauri falla (ej. falta de permisos del S.O.)
      this.isAutostartEnabled.set(!newValue);
      this.showToast(
        'error',
        'Error',
        'No se pudo cambiar la configuración del Sistema Operativo.',
      );
      console.error(err);
    }
  }

  private showToast(severity: string, summary: string, detail: string) {
    this.messageService.add({ severity, summary, detail, life: 3000 });
  }
}
