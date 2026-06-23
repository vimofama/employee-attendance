import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { RatingModule } from 'primeng/rating';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { RadioButtonModule } from 'primeng/radiobutton';
import { InputNumberModule } from 'primeng/inputnumber';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DailySummary, DashboardService } from '@app/admin/service/dashboard-service';
import {ObjectUtils} from "primeng/utils";

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    TableModule,
    FormsModule,
    ButtonModule,
    RippleModule,
    ToastModule,
    ToolbarModule,
    RatingModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    RadioButtonModule,
    InputNumberModule,
    DialogModule,
    TagModule,
    InputIconModule,
    IconFieldModule,
    ConfirmDialogModule,
  ],
  templateUrl: './dashboard.html',
  providers: [MessageService, ConfirmationService],
})
export class Dashboard implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  dailySummary = signal<DailySummary[]>([]);
  expandedRows = {};
  isExpanded = signal<boolean>(false);

  expandAll() {
    if(ObjectUtils.isEmpty(this.expandedRows)) {
      this.expandedRows = this.dailySummary().reduce(
          (acc, summary) => {
            acc[summary.employee.id] = true;
            return acc;
          },
          {} as { [key: string | number]: boolean }
      );
      this.isExpanded.set(true);
    } else {
      this.collapseAll()
    }

  }

  collapseAll() {
    this.expandedRows = {};
    this.isExpanded.set(false);
  }

  ngOnInit() {
    this.dashboardService
      .getDailyDashboard()
      .then((data) => {
        this.dailySummary.set(data);
      })
      .catch((err: Error) => console.error(err));
  }

  getStateSeverity(state: string): 'info' | 'success' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (state) {
      case 'Trabajando':
        return 'success';
      case 'En break':
        return 'warn';
      case 'Salió':
        return 'info';
      case 'No ha ingresado':
        return 'danger';
      default:
        return 'info';
    }
  }

  getEventTypeLabel(eventType: string): string {
    switch (eventType) {
      case 'WORK_START':
        return 'Inicio de Trabajo';
      case 'WORK_END':
        return 'Fin de Trabajo';
      case 'BREAK_START':
        return 'Inicio de Break';
      case 'BREAK_END':
        return 'Fin de Break';
      default:
        return eventType;
    }
  }

  getEventTypeSeverity(eventType: string): 'info' | 'success' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (eventType) {
      case 'WORK_START':
        return 'success';
      case 'WORK_END':
        return 'danger';
      case 'BREAK_START':
        return 'warn';
      case 'BREAK_END':
        return 'info';
      default:
        return 'info';
    }
  }

}
