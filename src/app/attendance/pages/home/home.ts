import { Component, signal, effect, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { form, FormField, required, maxLength, submit } from '@angular/forms/signals';
import { Button } from 'primeng/button';
import { AuthService } from '@app/auth/service/auth.service';
import { AttendanceService } from '@app/attendance/service/attendance-service';
import { AttendanceEventType } from '@app/shared/interfaces/types';
import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';

interface EmployeeDetails {
  employee: {
    name: string;
    code: string;
  };
  attendanceTime: string;
  status: string;
  workedMinutes: number;
}

@Component({
  selector: 'app-home',
  imports: [DatePipe, FormField, Button, Toast],
  templateUrl: './home.html',
  providers: [MessageService],
})
export class Home {
  private authService = inject(AuthService);
  private attendanceService = inject(AttendanceService);
  private readonly messageService = inject(MessageService);

  pinCodeModel = signal({
    pinCode: '',
  });
  f = form(this.pinCodeModel, (schema) => {
    required(schema.pinCode, { message: 'Please enter valid pinCode' });
    maxLength(schema.pinCode, 5, { message: 'Pin code cannot exceed 5 characters' });
  });
  time = signal<Date>(new Date());

  constructor() {
    effect((onCleanup) => {
      const timer = setInterval(() => {
        this.time.set(new Date());
      }, 1000);

      onCleanup(() => {
        clearInterval(timer);
      });
    });
  }

  async onSubmit(event: Event, eventType: AttendanceEventType) {
    event.preventDefault();
    await submit(this.f, async (field) => {
      const code = field.pinCode().value();
      this.attendanceService
        .registerEvent(code, eventType)
        .then(() => {
          switch (eventType) {
            case 'WORK_START':
              this.onWorkStart();
              break;
            case 'BREAK_START':
              this.onBreakStart();
              break;
            case 'BREAK_END':
              this.onBreakEnd();
              break;
            case 'WORK_END':
              this.onWorkEnd();
              break;
          }
          this.pinCodeModel.set({
            pinCode: '',
          });
        })
        .catch((err: Error) => this.onError(err.message));
    });
  }

  onWorkStart() {
    this.messageService.add({
      severity: 'success',
      summary: 'Éxito',
      detail: 'Inicio de trabajo registrado',
      life: 3000,
    });
  }
  onBreakStart() {
    this.messageService.add({
      severity: 'success',
      summary: 'Éxito',
      detail: 'Inicio de break registrado',
      life: 3000,
    });
  }
  onBreakEnd() {
    this.messageService.add({
      severity: 'success',
      summary: 'Éxito',
      detail: 'Fin de break registrado',
      life: 3000,
    });
  }
  onWorkEnd() {
    this.messageService.add({
      severity: 'success',
      summary: 'Éxito',
      detail: 'Fin de trabajo registrado',
      life: 3000,
    });
  }
  onError(errMessage: string) {
    this.pinCodeModel.set({
      pinCode: '',
    })
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: errMessage,
      life: 7000,
    });
  }

  async logout() {
    await this.authService.logout();
  }
}
