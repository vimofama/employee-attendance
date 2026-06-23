import { inject, Service } from '@angular/core';
import {
  AttendanceLog,
  Employee,
  OvertimeSummary,
  ReportConfig,
} from '@app/shared/interfaces/types';
import {
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
    // Formateamos la fecha a 'yyyy-MM-dd' usando date-fns para consultar en SQLite
    const dateStr = format(targetDate, 'yyyy-MM-dd');

    const activeEmployees = await this.employeeService.getActiveEmployees();
    const summaries: DailySummary[] = [];

    for (const emp of activeEmployees) {
      const logs = await this.dbService.db.select<AttendanceLog[]>(
        `SELECT * FROM attendance_logs WHERE employee_id = $1 AND occurred_at LIKE $2 ORDER BY occurred_at ASC`,
        [emp.id, `${dateStr}%`]
      );

      const state = this.deriveState(logs);
      const { workedMs, lateMinutes } = this.calculateMetrics(logs);

      summaries.push({
        employee: emp,
        logs,
        state,
        workedMs,
        formattedWorkedHours: this.formatMsToHoursMinutes(workedMs),
        totalLateMinutes: lateMinutes
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

    const lastEvent = logs[logs.length - 1];

    // date-fns: parsea la fecha y obtén el final del día (23:59:59.999)
    const dateObj = parseISO(dateStr);
    const targetTime = formatISO(endOfDay(dateObj));

    if (lastEvent.event_type === 'BREAK_START') {
      await this.dbService.db.execute(
        `INSERT INTO attendance_logs (employee_id, event_type, occurred_at, is_auto_close) VALUES ($1, 'BREAK_END', $2, 1)`,
        [employeeId, targetTime],
      );
    }

    await this.dbService.db.execute(
      `INSERT INTO attendance_logs (employee_id, event_type, occurred_at, is_auto_close) VALUES ($1, 'WORK_END', $2, 1)`,
      [employeeId, targetTime],
    );
  }

  // ==========================================
  // EDICIÓN ADMIN
  // ==========================================

  async adminEditLog(
    logId: number,
    newTimeStr: string,
    adminOverrideAutoClose = false,
  ): Promise<void> {
    const logs = await this.dbService.db.select<AttendanceLog[]>(
      'SELECT * FROM attendance_logs WHERE id = $1',
      [logId],
    );
    if (!logs[0]) throw new Error('Registro no encontrado');
    const log = logs[0];

    if (log.is_auto_close === 1 && !adminOverrideAutoClose) {
      throw new Error(
        'Requiere confirmación explícita para editar un registro de cierre automático.',
      );
    }

    let lateMinutesUpdate = log.late_minutes;

    if (log.event_type === 'WORK_START') {
      const empLogs = await this.dbService.db.select<Employee[]>(
        'SELECT * FROM employees WHERE id = $1',
        [log.employee_id],
      );
      const emp = empLogs[0];

      const newCheckInTime = parseISO(newTimeStr);
      // Reutiliza la lógica del attendance.service
      lateMinutesUpdate = this.attendanceService.calculateLateness(emp, newCheckInTime);
    }

    await this.dbService.db.execute(
      `UPDATE attendance_logs SET occurred_at = $1, late_minutes = $2 WHERE id = $3`,
      [newTimeStr, lateMinutesUpdate, logId],
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
      overtimeMultiplier = 2
    } = config;

    const activeEmployees = await this.employeeService.getActiveEmployees();
    const summaries: OvertimeSummary[] = [];

    // 1. Definir el rango del mes
    const monthStart = startOfMonth(new Date(year, month - 1)); // month - 1 porque date-fns / JS usa 0-11
    const monthEnd = endOfMonth(monthStart);

    // Obtener todos los días del mes
    const allDaysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // 2. Filtrar días si se especificaron semanas específicas
    const validDays = allDaysInMonth.filter(date => {
      if (!weeks || weeks.length === 0) return true; // Si no hay semanas, incluye todo el mes

      const dayOfMonth = getDate(date);
      let weekNum: 1 | 2 | 3 | 4;

      if (dayOfMonth <= 7) weekNum = 1;
      else if (dayOfMonth <= 14) weekNum = 2;
      else if (dayOfMonth <= 21) weekNum = 3;
      else weekNum = 4; // Día 22 en adelante

      return weeks.includes(weekNum);
    });

    // Convertimos las fechas válidas a strings 'yyyy-MM-dd' para buscar en la base de datos
    const validDateStrings = validDays.map(date => format(date, 'yyyy-MM-dd'));

    // 3. Calcular para cada empleado
    for (const emp of activeEmployees) {
      let totalWorkedMs = 0;

      // Iterar solo por los días que pasaron el filtro de semanas
      for (const dateStr of validDateStrings) {
        const logs = await this.dbService.db.select<AttendanceLog[]>(
          `SELECT * FROM attendance_logs WHERE employee_id = $1 AND occurred_at LIKE $2 ORDER BY occurred_at ASC`,
          [emp.id, `${dateStr}%`]
        );

        if (logs.length > 0) {
          const { workedMs } = this.calculateMetrics(logs);
          totalWorkedMs += workedMs;
        }
      }

      // 4. Convertir milisegundos a horas (redondeado a 2 decimales para evitar números infinitos)
      const horasMesExactas = totalWorkedMs / (1000 * 60 * 60);
      const horasMes = Math.round(horasMesExactas * 100) / 100;

      // 5. Determinar la base del mes (verificar si este empleado tiene una excepción)
      const baseMes = employeeBaseExceptions[emp.code] || defaultBaseHours;

      // 6. Aplicar las fórmulas del Excel
      const horasExtras = horasMes - baseMes;
      const valor = horasExtras * overtimeMultiplier;

      summaries.push({
        employeeName: emp.name,
        horasMes,
        baseMes,
        horasExtras,
        valor
      });
    }

    return summaries;
  }
}
