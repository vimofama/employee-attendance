import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { passwordMatchValidator } from '@app/shared/utils/password-match.validator';
import { Toast } from 'primeng/toast';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Password } from 'primeng/password';
import { Button } from 'primeng/button';
import { DashboardService } from '@app/admin/service/dashboard-service';

@Component({
  selector: 'app-local-password',
  imports: [Toast, ConfirmDialog, Password, ReactiveFormsModule, Button],
  templateUrl: './local-password.html',
  providers: [ConfirmationService, MessageService],
})
export class LocalPassword {
  private dashboardService = inject(DashboardService);
  private fb = inject(FormBuilder);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  form: FormGroup = this.fb.group(
    {
      password: ['', [Validators.required, Validators.minLength(4)]], // Supongamos que local pide mínimo 4
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordMatchValidator },
  );

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.confirmationService.confirm({
      message: '¿Estás seguro de que deseas cambiar la contraseña de la cuenta Local?',
      header: 'Confirmación Local',
      icon: 'pi pi-question-circle',
      acceptLabel: 'Confirmar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-info',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        this.savePassword();
      },
    });
  }

  private async savePassword() {
    try {
      const nuevaPassword = this.form.value.password;
      await this.dashboardService.updatePassword('local', nuevaPassword);

      this.messageService.add({
        severity: 'success',
        summary: 'Completado',
        detail: 'Contraseña Local modificada y encriptada con éxito.',
      });
      this.form.reset();
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error interno al actualizar la base de datos.',
      });
    }
  }
}
