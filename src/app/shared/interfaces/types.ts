export interface Employee {
  id: number;
  name: string;
  code: string;
  /** Formato HH:MM (e.g., '08:00') */
  schedule_start: string;
  /** Formato HH:MM (e.g., '17:00') */
  schedule_end: string;
  /** Tolerancia en minutos */
  late_tolerance: number;
  /** ISO String o formato datetime de SQLite */
  created_at: string;
  /** Representa un booleano (0 = falso, 1 = verdadero) */
  is_active: 0 | 1;
}

export type AttendanceEventType = 'WORK_START' | 'BREAK_START' | 'BREAK_END' | 'WORK_END';

export interface AttendanceLog {
  id: number;
  employee_id: number;
  event_type: AttendanceEventType;
  /** ISO String o formato datetime de SQLite */
  occurred_at: string;
  late_minutes: number;
  /** Representa un booleano (0 = falso, 1 = verdadero) */
  is_auto_close: 0 | 1;
}

export type UserRole = 'ADMIN' | 'LOCAL';

export interface User {
  id: number;
  username: string;
  password_hash: string;
  role: UserRole;
}

export interface OvertimeSummary {
  employeeName: string;
  horasMes: number;
  baseMes: number;
  horasExtras: number;
  valor: number;
}

export interface ReportConfig {
  year: number;
  /** Mes del 1 al 12 */
  month: number;
  /** Opcional: Arreglo de semanas a incluir (ej: [1, 2, 3, 4]) */
  weeks?: (1 | 2 | 3 | 4)[];
  /** Horas base por defecto para todos los empleados */
  defaultBaseHours: number;
  /** Diccionario para excepciones de horas base. Ej: { 'codigo_empleado': 240 } */
  employeeBaseExceptions?: Record<string, number>;
  /** Multiplicador para el valor a pagar (según tu Excel, es el doble) */
  overtimeMultiplier?: number;
}
