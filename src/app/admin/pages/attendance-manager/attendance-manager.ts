import { Component, inject, signal } from '@angular/core';
import { DashboardService } from '@app/admin/service/dashboard-service';
import { EmployeeService } from '@app/admin/service/employee-service';
import { ConfirmationService, MessageService } from 'primeng/api';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Employee } from '@app/shared/interfaces/types';
import { format, parseISO } from 'date-fns';
import { TableModule } from 'primeng/table';
import { DatePickerModule } from 'primeng/datepicker';
import { Button } from 'primeng/button';
import { DatePipe, NgClass } from '@angular/common';
import { Toast } from 'primeng/toast';
import { AutoComplete } from 'primeng/autocomplete';
import { Dialog } from 'primeng/dialog';
import { ConfirmDialog } from 'primeng/confirmdialog';

@Component({
  selector: 'app-attendance-manager',
  imports: [
    ReactiveFormsModule,
    TableModule,
    DatePickerModule,
    Button,
    NgClass,
    Toast,
    AutoComplete,
    DatePipe,
    Dialog,
    ConfirmDialog,
  ],
  templateUrl: './attendance-manager.html',
  providers: [MessageService, ConfirmationService],
})
export class AttendanceManager {
  private readonly service = inject(DashboardService);
  private readonly employeeService = inject(EmployeeService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly fb = inject(FormBuilder);

  loading = signal<boolean>(false);
  visibleDialog = signal<boolean>(false);

  employeesMaster = signal<Employee[]>([]);
  filteredEmployees = signal<Employee[]>([]);
  attendanceLogs = signal<any[]>([]);
  selectedLog = signal<any | null>(null);

  // Formulario de Búsqueda
  searchForm = this.fb.nonNullable.group({
    employee: [null as Employee | null, Validators.required],
    date: [new Date(), Validators.required],
  });

  // Formulario de Edición en Modal
  editForm = this.fb.nonNullable.group({
    time: [new Date(), Validators.required],
  });

  ngOnInit() {
    this.loadEmployees();
  }

  async loadEmployees() {
    try {
      const list = await this.employeeService.getActiveEmployees();
      this.employeesMaster.set(list);
      this.filteredEmployees.set(list);
    } catch (err) {
      this.showToast('error', 'Error', 'No se pudieron cargar los empleados');
    }
  }

  filterEmployees(event: any) {
    const query = event && typeof event.query === 'string' ? event.query.toLowerCase().trim() : '';
    const master = this.employeesMaster();

    if (query === '') {
      this.filteredEmployees.set([...master]);
    } else {
      this.filteredEmployees.set(
        master.filter(
          (emp) =>
            (emp.name && emp.name.toLowerCase().includes(query)) ||
            (emp.code && emp.code.toLowerCase().includes(query)),
        ),
      );
    }
  }

  async searchLogs() {
    if (this.searchForm.invalid) {
      this.searchForm.markAllAsTouched();
      return;
    }

    try {
      this.loading.set(true);
      const { employee, date } = this.searchForm.getRawValue();
      const formattedDate = format(date!, 'yyyy-MM-dd');

      const logs = await this.service.getEmployeeLogsByDate(employee!.id, formattedDate);
      this.attendanceLogs.set(logs);
    } catch (err) {
      this.showToast('error', 'Error', 'Error al buscar los registros');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Abre el Modal cargando los datos del log seleccionado
   */
  openEditDialog(log: any) {
    this.selectedLog.set(log);

    // Parseamos el string ISO a un objeto Date para inicializar el p-datePicker [timeOnly]
    const currentLogDate = parseISO(log.occurred_at);
    this.editForm.patchValue({ time: currentLogDate });

    this.visibleDialog.set(true);
  }

  /**
   * Envía la actualización procesando la fecha completa combinada
   */
  async onSaveEdit(event: Event) {
    event.preventDefault();
    if (this.editForm.invalid || !this.selectedLog()) return;

    try {
      this.loading.set(true);
      const log = this.selectedLog()!;
      const { time: newTimeValue } = this.editForm.getRawValue();

      // 1. Extraemos de forma segura el formato 'YYYY-MM-DD' del registro original
      // log.occurred_at es algo como '2026-06-15T08:00:00' o '2026-06-15 08:00:00'
      const originalDatePart = log.occurred_at.split('T')[0].split(' ')[0]; // Resultado: '2026-06-15'

      // 2. Formateamos las nuevas horas y minutos elegidos en el p-datePicker
      const hours = String(newTimeValue.getHours()).padStart(2, '0');
      const minutes = String(newTimeValue.getMinutes()).padStart(2, '0');
      const seconds = '00';

      // 3. Recomponemos el string ISO de manera manual sin desfases de zona horaria (UTC)
      // Esto garantiza que se guarde exactamente en la misma fecha local que ya tenía el registro
      const finalIsoString = `${originalDatePart}T${hours}:${minutes}:${seconds}`;

      console.log('Guardando fecha corregida sin alteración:', finalIsoString);

      // 4. Enviamos al backend
      await this.service.updateLogTime(log.id, finalIsoString);

      this.showToast('success', 'Éxito', 'Registro de asistencia actualizado.');
      this.visibleDialog.set(false);
      await this.searchLogs();
    } catch (err: any) {
      this.showToast('error', 'Error', err.message || 'No se pudo guardar la modificación');
    } finally {
      this.loading.set(false);
    }
  }

  deleteLog(event: Event, logId: number) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: '¿Estás seguro de que deseas eliminar este registro de asistencia?',
      header: 'Eliminar',
      icon: 'pi pi-info-circle',
      rejectLabel: 'Cancelar',
      rejectButtonProps: {
        label: 'Cancelar',
        severity: 'secondary',
        outlined: true,
      },
      acceptButtonProps: {
        label: 'Eliminar',
        severity: 'danger',
      },

      accept: async () => {
        try {
          this.loading.set(true);
          await this.service.deleteLog(logId);
          this.showToast('info', 'Eliminado', 'El registro ha sido removido.');
          await this.searchLogs();
        } catch (err) {
          this.showToast('error', 'Error', 'No se pudo eliminar el registro');
        } finally {
          this.loading.set(false);
        }
      },
    });
  }

  private showToast(severity: string, summary: string, detail: string) {
    this.messageService.add({ severity, summary, detail, life: 3000 });
  }
}
