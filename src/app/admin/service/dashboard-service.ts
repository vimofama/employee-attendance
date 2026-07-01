import { inject, Service } from '@angular/core';
import {
  AttendanceLog,
  Employee,
  OvertimeSummary,
  ReportConfig,
} from '@app/shared/interfaces/types';
import {
  addMinutes,
  differenceInMilliseconds,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  format,
  formatISO,
  getDate,
  parseISO,
  startOfMonth,
} from 'date-fns';
import bcrypt from 'bcryptjs';
import { DatabaseService } from '@app/shared/service/database';
import { EmployeeService } from '@app/admin/service/employee-service';
import { AttendanceService } from '@app/attendance/service/attendance-service';

export interface DailySummary {
  employee: Employee;
  logs: AttendanceLog[];
  state: 'No ha ingresado' | 'Trabajando' | 'En break' | 'Salió';
  workedMs: number;
  formattedWorkedHours: string;
  totalLateMinutes: number;
}

@Service()
export class DashboardService {
  private dbService = inject(DatabaseService);
  private employeeService = inject(EmployeeService);
  private attendanceService = inject(AttendanceService);

  // ==========================================
  // DASHBOARD Y MÉTRICAS
  // ==========================================
  /**
   * Obtiene el resumen diario de todos los empleados activos.
   * Si no se especifica una fecha, calcula el resumen del día actual.
   */
  async getDailyDashboard(targetDate: Date = new Date()): Promise<DailySummary[]> {
    const dateStr = format(targetDate, 'yyyy-MM-dd');

    const activeEmployees = await this.employeeService.getActiveEmployees();
    const summaries: DailySummary[] = [];

    for (const emp of activeEmployees) {
      const logs = await this.dbService.db.select<AttendanceLog[]>(
        `SELECT * FROM attendance_logs WHERE employee_id = $1 AND occurred_at LIKE $2 ORDER BY occurred_at ASC`,
        [emp.id, `${dateStr}%`],
      );

      const state = this.deriveState(logs);
      const { workedMs, lateMinutes } = this.calculateMetrics(logs);

      summaries.push({
        employee: emp,
        logs,
        state,
        workedMs,
        formattedWorkedHours: this.formatMsToHoursMinutes(workedMs),
        totalLateMinutes: lateMinutes,
      });
    }

    return summaries;
  }
  private deriveState(logs: AttendanceLog[]): DailySummary['state'] {
    if (logs.length === 0) return 'No ha ingresado';
    const lastEvent = logs[logs.length - 1].event_type;
    if (lastEvent === 'WORK_START' || lastEvent === 'BREAK_END') return 'Trabajando';
    if (lastEvent === 'BREAK_START') return 'En break';
    return 'Salió';
  }

  private calculateMetrics(logs: AttendanceLog[]): { workedMs: number; lateMinutes: number } {
    let workedMs = 0;
    let lateMinutes = logs.find((l) => l.event_type === 'WORK_START')?.late_minutes || 0;

    let workStart: Date | null = null;
    let totalBreakMs = 0;
    let breakStart: Date | null = null;

    logs.forEach((log) => {
      const time = parseISO(log.occurred_at);
      if (log.event_type === 'WORK_START') workStart = time;
      if (log.event_type === 'WORK_END' && workStart) {
        workedMs = differenceInMilliseconds(time, workStart);
      }
      if (log.event_type === 'BREAK_START') breakStart = time;
      if (log.event_type === 'BREAK_END' && breakStart) {
        totalBreakMs += differenceInMilliseconds(time, breakStart);
        breakStart = null;
      }
    });

    if (workStart && !logs.some((l) => l.event_type === 'WORK_END')) {
      const endTimeToUse = breakStart ? breakStart : new Date();
      workedMs = differenceInMilliseconds(endTimeToUse, workStart);
    }

    workedMs -= totalBreakMs;
    return { workedMs: Math.max(0, workedMs), lateMinutes };
  }

  private formatMsToHoursMinutes(ms: number): string {
    const totalMins = Math.floor(ms / 60000);
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${hours}h ${mins}m`;
  }

  // ==========================================
  // CIERRE AUTOMÁTICO
  // ==========================================

  async runAutoCloseRoutine(): Promise<void> {
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    const unfinishedJourneys = await this.dbService.db.select<
      { employee_id: number; work_date: string }[]
    >(
      `
      SELECT employee_id, date(occurred_at) as work_date
      FROM attendance_logs
      WHERE date(occurred_at) < $1
      GROUP BY employee_id, date(occurred_at)
      HAVING SUM(CASE WHEN event_type = 'WORK_END' THEN 1 ELSE 0 END) = 0
    `,
      [todayStr],
    );

    for (const journey of unfinishedJourneys) {
      await this.closeJourney(journey.employee_id, journey.work_date);
    }
  }

  private async closeJourney(employeeId: number, dateStr: string): Promise<void> {
    const logs = await this.dbService.db.select<AttendanceLog[]>(
      `SELECT * FROM attendance_logs WHERE employee_id = $1 AND date(occurred_at) = $2 ORDER BY occurred_at ASC`,
      [employeeId, dateStr],
    );

    if (logs.length === 0) return;
    const lastEvent = logs[logs.length - 1];

    const empLogs = await this.dbService.db.select<Employee[]>(
      'SELECT * FROM employees WHERE id = $1',
      [employeeId],
    );
    if (!empLogs[0]) return;
    const emp = empLogs[0];

    const [endHoursStr, endMinutesStr] = emp.schedule_end.split(':');
    const workEndTimeStr = `${dateStr}T${endHoursStr}:${endMinutesStr}:00`;

    if (lastEvent.event_type === 'BREAK_START') {
      const breakStartTime = parseISO(lastEvent.occurred_at);
      const breakEndTimeObj = addMinutes(breakStartTime, 60);
      const breakEndTimeStr = format(breakEndTimeObj, "yyyy-MM-dd'T'HH:mm:ss");

      await this.dbService.db.execute(
        `INSERT INTO attendance_logs (employee_id, event_type, occurred_at, is_auto_close) VALUES ($1, 'BREAK_END', $2, 1)`,
        [employeeId, breakEndTimeStr],
      );
    }
    await this.dbService.db.execute(
      `INSERT INTO attendance_logs (employee_id, event_type, occurred_at, is_auto_close) VALUES ($1, 'WORK_END', $2, 1)`,
      [employeeId, workEndTimeStr],
    );
  }

  /**
   * Genera el reporte mensual de horas extras basado en la estructura de Excel.
   */
  async getMonthlyOvertimeReport(config: ReportConfig): Promise<OvertimeSummary[]> {
    const {
      year,
      month,
      weeks,
      defaultBaseHours,
      employeeBaseExceptions = {},
      overtimeMultiplier = 2,
    } = config;

    const activeEmployees = await this.employeeService.getActiveEmployees();
    const summaries: OvertimeSummary[] = [];

    const monthStart = startOfMonth(new Date(year, month - 1)); // month - 1 porque date-fns / JS usa 0-11
    const monthEnd = endOfMonth(monthStart);

    const allDaysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const validDays = allDaysInMonth.filter((date) => {
      if (!weeks || weeks.length === 0) return true;

      const dayOfMonth = getDate(date);
      let weekNum: 1 | 2 | 3 | 4;

      if (dayOfMonth <= 7) weekNum = 1;
      else if (dayOfMonth <= 14) weekNum = 2;
      else if (dayOfMonth <= 21) weekNum = 3;
      else weekNum = 4; // Día 22 en adelante

      return weeks.includes(weekNum);
    });

    const validDateStrings = validDays.map((date) => format(date, 'yyyy-MM-dd'));

    for (const emp of activeEmployees) {
      let totalWorkedMs = 0;

      for (const dateStr of validDateStrings) {
        const logs = await this.dbService.db.select<AttendanceLog[]>(
          `SELECT * FROM attendance_logs WHERE employee_id = $1 AND occurred_at LIKE $2 ORDER BY occurred_at ASC`,
          [emp.id, `${dateStr}%`],
        );

        if (logs.length > 0) {
          const { workedMs } = this.calculateMetrics(logs);
          totalWorkedMs += workedMs;
        }
      }

      const horasMesExactas = totalWorkedMs / (1000 * 60 * 60);
      const horasMes = Math.round(horasMesExactas * 100) / 100;

      const baseMes = employeeBaseExceptions[emp.code] || defaultBaseHours;

      const horasExtras = horasMes - baseMes;
      const valor = horasExtras * overtimeMultiplier;

      summaries.push({
        employeeName: emp.name,
        horasMes,
        baseMes,
        horasExtras,
        valor,
      });
    }

    return summaries;
  }

  // ==========================================
  // GESTIÓN DE SEGURIDAD Y CONFIGURACIÓN
  // ==========================================

  /**
   * Actualiza la contraseña de un usuario encriptándola con bcryptjs.
   * @param username El nombre de usuario único ('admin' o 'local')
   * @param plainPassword La nueva contraseña en texto plano desde el formulario
   */
  async updatePassword(username: 'admin' | 'local', plainPassword: string): Promise<void> {
    const users = await this.dbService.db.select<{ id: number }[]>(
      'SELECT id FROM users WHERE username = $1',
      [username],
    );

    if (!users || users.length === 0) {
      throw new Error(`El usuario con el nombre de cuenta '${username}' no existe.`);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);

    await this.dbService.db.execute('UPDATE users SET password_hash = $1 WHERE username = $2', [
      hashedPassword,
      username,
    ]);
  }

  // ==========================================
  // CONTROL DE ASISTENCIA PERSONALIZADO
  // ==========================================

  /**
   * Obtiene todos los logs de un empleado específico en una fecha concreta.
   */
  async getEmployeeLogsByDate(employeeId: number, dateStr: string): Promise<any[]> {
    return await this.dbService.db.select<any[]>(
      `SELECT l.*, e.name as employee_name, e.schedule_start, e.late_tolerance
     FROM attendance_logs l
     JOIN employees e ON l.employee_id = e.id
     WHERE l.employee_id = $1 AND l.occurred_at LIKE $2
     ORDER BY l.occurred_at ASC`,
      [employeeId, `${dateStr}%`],
    );
  }

  /**
   * Modifica la fecha/hora de un registro recalculando penalizaciones de retraso si aplica.
   */
  async updateLogTime(logId: number, newTimeStr: string): Promise<void> {
    const logs = await this.dbService.db.select<any[]>(
      `SELECT l.*, e.schedule_start, e.late_tolerance
     FROM attendance_logs l
     JOIN employees e ON l.employee_id = e.id
     WHERE l.id = $1`,
      [logId],
    );

    if (!logs[0]) throw new Error('Registro no encontrado');
    const log = logs[0];
    let lateMinutesUpdate = log.late_minutes;

    if (log.event_type === 'WORK_START') {
      const empMock: Employee = {
        id: log.employee_id,
        name: '',
        code: '',
        schedule_start: log.schedule_start,
        schedule_end: '',
        late_tolerance: log.late_tolerance,
        created_at: '',
        is_active: 1,
      };
      const newCheckInTime = parseISO(newTimeStr);
      lateMinutesUpdate = this.attendanceService.calculateLateness(empMock, newCheckInTime);
    }

    await this.dbService.db.execute(
      `UPDATE attendance_logs SET occurred_at = $1, late_minutes = $2 WHERE id = $3`,
      [newTimeStr, lateMinutesUpdate, logId],
    );
  }

  /**
   * Elimina un log de asistencia permanentemente.
   */
  async deleteLog(logId: number): Promise<void> {
    await this.dbService.db.execute('DELETE FROM attendance_logs WHERE id = $1', [logId]);
  }
}
