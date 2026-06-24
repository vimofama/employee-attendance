import { Component, signal, effect, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { form, FormField, required, maxLength, submit } from '@angular/forms/signals';
import { Button } from 'primeng/button';
import { AuthService } from '@app/auth/service/auth.service';
import { AttendanceService } from '@app/attendance/service/attendance-service';
import { AttendanceEventType } from '@app/shared/interfaces/types';

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
  imports: [DatePipe, FormField, Button],
  templateUrl: './home.html',
})
export class Home {
  private authService = inject(AuthService);
  private attendanceService = inject(AttendanceService);
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
        .then((r) => {
          console.log(r);
          this.pinCodeModel.set({
            pinCode: '',
          })
        })
        .catch((err) => console.log(err));
    });
  }

  async logout() {
    await this.authService.logout();
  }
}
