import { Component, inject, output } from '@angular/core';
import { signal } from '@angular/core';
import { form, required, maxLength, FormField } from '@angular/forms/signals';
import { EmployeeService } from '@app/admin/service/employee-service';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { FormsModule } from '@angular/forms';
import { getHours, getMinutes } from 'date-fns';

interface CreateEmployeeModel {
  name: string;
  scheduleStart: string;
  scheduleEnd: string;
  lateTolerance: number;
}

@Component({
  selector: 'app-new-employee-form',
  imports: [FormField, Button, DatePicker, FormsModule],
  templateUrl: './new-employee-form.html',
})
export class NewEmployeeForm {
  private readonly employeeService = inject(EmployeeService);

  created = output();
  cancel = output();
  date = Date.now();

  model = signal<CreateEmployeeModel>({
    name: '',
    scheduleStart: `${getHours(this.date).toString().padStart(2, '0')}:${getMinutes(this.date).toString().padStart(2, '0')}`,
    scheduleEnd: `${getHours(this.date).toString().padStart(2, '0')}:${getMinutes(this.date).toString().padStart(2, '0')}`,
    lateTolerance: 5,
  });

  f = form(this.model, (schema) => {
    required(schema.name, { message: 'Nombre requerido' });
    required(schema.scheduleStart, { message: 'Hora de entrada requerida' });
    required(schema.scheduleEnd, { message: 'Hora de salida requerida' });
    required(schema.lateTolerance, { message: 'Tolerancia de tardanza requerida' });
    maxLength(schema.name, 50, { message: 'Nombre no puede exceder 50 caracteres' });
  });

  onSubmit(event: Event) {
    event.preventDefault();

    const newEmployee = this.f().value();
    console.log(newEmployee);

    this.employeeService
      .createEmployee(
        newEmployee.name,
        newEmployee.scheduleStart,
        newEmployee.scheduleEnd,
        newEmployee.lateTolerance,
      )
      .then(() => {
        this.model.set({ name: '', scheduleStart: '', scheduleEnd: '', lateTolerance: 0 });
        this.created.emit();
      })
      .catch((err: Error) => alert(`Error al crear: ${err.message}`));
  }

  onCancelClick() {
    this.cancel.emit();
  }

  onChangeScheduleStart($event: Date) {
    const hour = getHours($event);
    const minutes = getMinutes($event);
    this.model.set({
      ...this.model(),
      scheduleStart: `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
    });
  }

  onChangeScheduleEnd($event: Date) {
    const hour = getHours($event);
    const minutes = getMinutes($event);
    this.model.set({
      ...this.model(),
      scheduleEnd: `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
    });
  }
}
