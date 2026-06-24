import { inject, Service } from '@angular/core';
import { EmployeeService } from '@app/admin/service/employee-service';
import { AttendanceEventType, AttendanceLog, Employee } from '@app/shared/interfaces/types';
import { DatabaseService } from '@app/shared/service/database';
import { differenceInMinutes, format, formatISO, parse } from 'date-fns';
import {QueryResult} from '@tauri-apps/plugin-sql';

@Service()
export class AttendanceService {
  private dbService = inject(DatabaseService);
  private employeeService = inject(EmployeeService);

  async registerEvent(
    code: string,
    eventType: AttendanceEventType,
    notes: string | null = null,
  ): Promise<QueryResult> {
    const employee = await this.employeeService.getEmployeeByCode(code);

    if (!employee) throw new Error('Código de empleado no existe.');
    if (employee.is_active === 0)
      throw new Error('Empleado inactivo no puede registrar asistencia.');

    const now = new Date();
    // yyyy-MM-dd para buscar en la BD
    const todayDateStr = format(now, 'yyyy-MM-dd');
    const todayLogs = await this.getLogsForDay(employee.id, todayDateStr);

    // 1. Validar Secuencia
    this.validateSequence(todayLogs, eventType);

    // 2. Calcular Retraso (Solo en WORK_START)
    let lateMinutes = 0;
    if (eventType === 'WORK_START') {
      lateMinutes = this.calculateLateness(employee, now);
    }

    // 3. Insertar
    return await this.dbService.db.execute(
      'INSERT INTO attendance_logs (employee_id, event_type, occurred_at, late_minutes) VALUES ($1, $2, $3, $4)',
      [employee.id, eventType, formatISO(now), lateMinutes],
    );
  }

  private validateSequence(logs: AttendanceLog[], incomingEvent: AttendanceEventType): void {
    const hasWorkEnd = logs.some((log) => log.event_type === 'WORK_END');
    if (hasWorkEnd) throw new Error('La jornada ya está cerrada por hoy.');

    const lastEvent = logs.length > 0 ? logs[logs.length - 1].event_type : null;

    switch (incomingEvent) {
      case 'WORK_START':
        if (lastEvent !== null) throw new Error('Ya existe un inicio de jornada.');
        break;
      case 'BREAK_START':
        if (lastEvent !== 'WORK_START' && lastEvent !== 'BREAK_END')
          throw new Error('No se puede iniciar break en este momento.');
        break;
      case 'BREAK_END':
        if (lastEvent !== 'BREAK_START') throw new Error('No hay un break abierto para cerrar.');
        break;
      case 'WORK_END':
        if (lastEvent === 'BREAK_START')
          throw new Error('Debe cerrar el break antes de finalizar la jornada.');
        if (lastEvent === null)
          throw new Error('No se puede finalizar la jornada sin haberla iniciado.');
        break;
    }
  }

  public calculateLateness(employee: Employee, checkInTime: Date): number {
    // Convierte el HH:mm de schedule_start en un objeto Date correspondiente al día actual
    const scheduledTime = parse(employee.schedule_start, 'HH:mm', checkInTime);

    // date-fns compara checkInTime vs scheduledTime
    const diffMinutes = differenceInMinutes(checkInTime, scheduledTime);

    return diffMinutes > employee.late_tolerance ? diffMinutes : 0;
  }

  async getLogsForDay(employeeId: number, dateStr: string): Promise<AttendanceLog[]> {
    return await this.dbService.db.select<AttendanceLog[]>(
      `SELECT * FROM attendance_logs
       WHERE employee_id = $1 AND occurred_at LIKE $2
       ORDER BY occurred_at ASC`,
      [employeeId, `${dateStr}%`],
    );
  }
}
