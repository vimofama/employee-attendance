import { Component, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { PasswordModule } from 'primeng/password';
import { Router, RouterModule } from '@angular/router';
import { RippleModule } from 'primeng/ripple';
import { AuthService } from '../../service/auth.service';
import { form, FormField, FormRoot, required } from '@angular/forms/signals';
import { Toast } from 'primeng/toast';
import { MessageService } from 'primeng/api';

interface LoginFormModel {
  username: string;
  password: string;
}

@Component({
  selector: 'app-login',
  imports: [
    ButtonModule,
    CheckboxModule,
    InputTextModule,
    PasswordModule,
    RouterModule,
    RippleModule,
    FormField,
    FormRoot,
    Toast,
  ],
  templateUrl: './login.html',
  providers: [MessageService],
})
export class Login {
  private authService = inject(AuthService);
  private router = inject(Router);
  private messageService = inject(MessageService);

  loginModel = signal<LoginFormModel>({
    username: '',
    password: '',
  });

  f = form(
    this.loginModel,
    (s) => {
      required(s.username, { message: 'Usuario requerido' });
    },
    {
      submission: {
        action: async (field) => {
          const result = await this.authService.login(
            field.username().value(),
            field.password().value(),
          );
          console.log(result);
          if (result != null) {
            await this.router.navigate(['/', result.toLowerCase()], { replaceUrl: true });
          }
          this.showError();
          return { kind: 'Error', message: 'Failed to login' };
        },
      },
    },
  );

  showError() {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Error al iniciar sesión',
      life: 3000,
    });
    this.loginModel.set({
      username: '',
      password: '',
    });
  }
}
