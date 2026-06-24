CREATE TABLE IF NOT EXISTS employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  schedule_start TEXT NOT NULL,
  schedule_end TEXT NOT NULL,
  late_tolerance INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS attendance_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees (id),
  event_type TEXT NOT NULL CHECK (event_type IN ('WORK_START', 'BREAK_START', 'BREAK_END', 'WORK_END')),
  occurred_at TEXT NOT NULL,
  late_minutes INTEGER NOT NULL DEFAULT 0,
  is_auto_close INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN','LOCAL'))
);

CREATE INDEX IF NOT EXISTS idx_logs_employee_date ON attendance_logs(employee_id, occurred_at);
