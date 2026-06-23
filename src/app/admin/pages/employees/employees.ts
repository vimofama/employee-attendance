import { Component, signal, inject, OnInit } from '@angular/core';
import { DrawerModule } from 'primeng/drawer';
import { CommonModule, DatePipe } from '@angular/common';
import type { Employee } from '@app/shared/interfaces/types';
import { EmployeeService } from '@app/admin/service/employee-service';
import { NewEmployeeForm } from '@app/admin/components/new-employee-form/new-employee-form';
import { Button, ButtonDirective } from 'primeng/button';
import { Toast } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { Avatar } from 'primeng/avatar';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Dialog } from 'primeng/dialog';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePicker } from 'primeng/datepicker';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { RadioButton } from 'primeng/radiobutton';
import { getHours } from 'date-fns';

@Component({
  selector: 'app-employees',
  imports: [
    DrawerModule,
    CommonModule,
    DatePipe,
    NewEmployeeForm,
    Button,
    Toast,
    TableModule,
    Avatar,
    ConfirmDialog,
    Dialog,
    FormsModule,
    ButtonDirective,
    DatePicker,
    InputNumber,
    InputText,
    RadioButton,
    ReactiveFormsModule,
  ],
  templateUrl: './employees.html',
  providers: [MessageService, ConfirmationService],
})
export class Employees implements OnInit {
  private readonly employeeService = inject(EmployeeService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly fb = inject(FormBuilder);

  visible = signal<boolean>(false);
  employees = signal<Employee[]>([]);
  loading = signal<boolean>(false);
  visibleDialog = signal<boolean>(false);
  selectedEmployee = signal<Employee | null>(null);

  form = this.fb.group({
    name: ['', Validators.required],
    schedule_start: [new Date(), Validators.required],
    schedule_end: [new Date(), Validators.required],
    late_tolerance: [5, Validators.required],
    is_active: [1, Validators.required],
  });

  ngOnInit() {
    this.loadEmployees();
  }

  loadEmployees() {
    this.loading.set(true);
    this.employeeService
      .getEmployees()
      .then((array) => {
        this.employees.set(array);
      })
      .catch((err) => {
        this.loading.set(false);
        console.log('Failed loading employees', err);
      });
  }

  onEmployeeCreated() {
    this.messageService.add({ severity: 'info', summary: 'Info', detail: 'Usuario creado' });
    this.visible.set(false);
    this.loadEmployees();
  }

  onCancel() {
    this.visible.set(false);
    this.visibleDialog.set(false);
  }

  deleteEmployee(id: number) {
    this.confirmationService.confirm({
      message: '¿Seguro quieres eliminar al usuario?',
      header: 'Confirmar',
      icon: 'pi pi-exclamation-triangle',
      rejectButtonProps: {
        label: 'Cancelar',
        severity: 'secondary',
        outlined: true,
      },
      acceptButtonProps: {
        label: 'Eliminar',
        severity: 'danger',
      },
      accept: () => {
        this.employeeService
          .deleteEmployee(id)
          .then(() => {
            this.messageService.add({
              severity: 'info',
              summary: 'Info',
              detail: 'Usuario eliminado',
              life: 3000,
            });
            this.loadEmployees();
          })
          .catch((err) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: `Error al eliminar, ${err}`,
              life: 6000,
            });
          });
      },
    });
  }

  showDialog(employee: Employee) {
    this.selectedEmployee.set(employee);

    const dateStart = new Date();
    const scheduleStart = this.selectedEmployee()!.schedule_start.split(':');
    dateStart.setHours(Number(scheduleStart[0]), Number(scheduleStart[1]));

    const dateEnd = new Date();
    const scheduleEnd = this.selectedEmployee()!.schedule_end.split(':');
    dateEnd.setHours(Number(scheduleEnd[0]), Number(scheduleEnd[1]));

    this.form.patchValue({
      name: this.selectedEmployee()!.name,
      schedule_start: dateStart,
      schedule_end: dateEnd,
      late_tolerance: this.selectedEmployee()!.late_tolerance,
      is_active: this.selectedEmployee()!.is_active,
    });

    this.visibleDialog.set(true);
  }

  onEmployeeUpdated() {
    this.messageService.add({ severity: 'info', summary: 'Info', detail: 'Usuario actualizado' });
    this.visibleDialog.set(false);
    this.selectedEmployee.set(null);
    this.loadEmployees();
  }

  onSubmit(event: Event) {
    event.preventDefault();
    if (this.form.valid) {
      const updatedData = {
        id: this.selectedEmployee()!.id,
        name: this.form.value.name!,
        schedule_start: this.getHoursAndMinutes(this.form.value.schedule_start!),
        schedule_end: this.getHoursAndMinutes(this.form.value.schedule_end!),
        late_tolerance: this.form.value.late_tolerance!,
        is_active: this.form.value.is_active!,
      };
      if (updatedData.is_active === 0 || updatedData.is_active === 1) {
        this.employeeService
          .updateEmployee(
            updatedData.id,
            updatedData.name,
            updatedData.schedule_start,
            updatedData.schedule_end,
            updatedData.late_tolerance,
            updatedData.is_active,
          )
          .then(() => {
            this.onEmployeeUpdated();
          })
          .catch((err: Error) => {
            alert(`Error al actualizar: ${err.message}`);
          });
      }
    }
  }

  getHoursAndMinutes(date: Date): string {
    const hour = getHours(date);
    const minutes = date.getMinutes();
    return `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
}
