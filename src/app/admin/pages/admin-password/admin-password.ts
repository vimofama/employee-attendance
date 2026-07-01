import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { passwordMatchValidator } from '@app/shared/utils/password-match.validator';
import { DashboardService } from '@app/admin/service/dashboard-service';

@Component({
  selector: 'app-admin-password',
  imports: [PasswordModule, ButtonModule, ConfirmDialogModule, ToastModule, ReactiveFormsModule],
  templateUrl: './admin-password.html',
  providers: [ConfirmationService, MessageService],
})
export class AdminPassword {
  private dashboardService = inject(DashboardService);
  private fb = inject(FormBuilder);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);

  form = this.fb.group(
    {
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validator: passwordMatchValidator },
  );

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.confirmationService.confirm({
      message: '¿Estás seguro de que deseas cambiar la contraseña del Administrador?',
      header: 'Confirmación de Seguridad',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, cambiar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        this.savePassword();
      },
    });
  }

  private async savePassword() {
    try {
      const nuevaPassword = this.form.value.password;
      await this.dashboardService.updatePassword('admin', nuevaPassword);

      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Contraseña de Administrador actualizada y encriptada correctamente.',
      });
      this.form.reset();
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo actualizar la contraseña en la base de datos.',
      });
    }
  }
}
