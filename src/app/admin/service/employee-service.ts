import { inject, Service } from '@angular/core';
import { DatabaseService } from '@app/shared/service/database';
import { Employee } from '@app/shared/interfaces/types';
import { QueryResult } from '@tauri-apps/plugin-sql';

@Service()
export class EmployeeService {
  private dbService = inject(DatabaseService);

  async createEmployee(
    name: string,
    scheduleStart: string,
    scheduleEnd: string,
    lateTolerance: number,
  ): Promise<void> {
    let code = '';
    let isUnique = false;

    while (!isUnique) {
      code = Math.floor(1000 + Math.random() * 9000).toString();
      const existing = await this.dbService.db.select<{ id: number }[]>(
        'SELECT id FROM employees WHERE code = $1',
        [code],
      );
      if (existing.length === 0) isUnique = true;
    }

    await this.dbService.db.execute(
      'INSERT INTO employees (name, code, schedule_start, schedule_end, late_tolerance, is_active) VALUES ($1, $2, $3, $4, $5, 1)',
      [name, code, scheduleStart, scheduleEnd, lateTolerance],
    );
  }

  async getEmployees(): Promise<Employee[]> {
    return await this.dbService.db.select<Employee[]>('SELECT * FROM employees');
  }
  async getActiveEmployees(): Promise<Employee[]> {
    return await this.dbService.db.select<Employee[]>(
      'SELECT * FROM employees WHERE is_active = 1',
    );
  }

  async getEmployeeByCode(code: string): Promise<Employee | null> {
    const result = await this.dbService.db.select<Employee[]>(
      'SELECT * FROM employees WHERE code = $1',
      [code],
    );
    return result.length ? result[0] : null;
  }

  async deleteEmployee(id: number): Promise<void> {
    await this.dbService.db.execute('UPDATE employees SET is_active = 0 WHERE id = $1', [id]);
  }

  async updateEmployee(
    id: number,
    name: string,
    schedule_start: string,
    schedule_end: string,
    late_tolerance: number,
    is_active: 0 | 1,
  ): Promise<QueryResult> {
    return await this.dbService.db.execute(
      `UPDATE employees SET name = $1, schedule_start = $2, schedule_end = $3, late_tolerance = $4, is_active = $5
WHERE id = $6`,
      [name, schedule_start, schedule_end, late_tolerance, is_active, id],
    );
  }
}
