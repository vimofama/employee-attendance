import { Component, signal, inject, ViewChild } from '@angular/core';
import { DatePickerModule } from 'primeng/datepicker';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { DashboardService } from '@app/admin/service/dashboard-service';
import { OvertimeSummary, ReportConfig } from '@app/shared/interfaces/types';
import { Table, TableModule } from 'primeng/table';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { format, getMonth, getYear } from 'date-fns';
import { Button } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { InputNumber } from 'primeng/inputnumber';
import { Toast } from 'primeng/toast';

@Component({
  selector: 'app-history',
  imports: [
    DatePickerModule,
    CommonModule,
    TableModule,
    DecimalPipe,
    CurrencyPipe,
    FormsModule,
    Button,
    InputNumber,
    ReactiveFormsModule,
    Toast,
  ],
  templateUrl: './history.html',
  providers: [MessageService],
})
export class History {
  private readonly service = inject(DashboardService);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);

  @ViewChild('dt') dt!: Table;

  loading = signal<boolean>(false);

  form = this.fb.nonNullable.group({
    defaultBaseHours: [160],
    date: [new Date()],
  });

  summary = signal<OvertimeSummary[]>([]);

  cols = [
    { field: 'employeeName', header: 'Nombre' },
    { field: 'horasMes', header: 'Horas' },
    { field: 'horasExtras', header: 'Horas Extras' },
    { field: 'valor', header: 'Valor' },
  ];

  async loadSummary() {
    try {
      if (this.form.valid) {
        const { defaultBaseHours, date } = this.form.getRawValue();
        const reportConfig: ReportConfig = {
          defaultBaseHours,
          month: getMonth(date) + 1,
          year: getYear(date),
        };
        this.loading.set(true);
        const report = await this.service.getMonthlyOvertimeReport(reportConfig);
        this.summary.set(report);
        this.loading.set(false);
      }
    } catch (err) {
      console.error('Failed loading report', err);
      this.summary.set([]);
    }
  }

  exportCSV() {
    const day = format(this.form.getRawValue().date, 'MM-yy');
    this.dt.exportFilename = `Resumen_Horas_Trabajo-${day}`;
    this.dt.exportCSV();
    this.messageService.add({
      severity: 'info',
      summary: 'Info',
      detail: 'Archivo descargado',
      life: 3000,
    });
  }
}
