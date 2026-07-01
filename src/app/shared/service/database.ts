import { Service, signal } from '@angular/core';

import Database from '@tauri-apps/plugin-sql';

@Service()
export class DatabaseService{
  isReady = signal<boolean>(false);
  db!: Database;

  async initDatabase(): Promise<Database> {
    if (this.isReady()) return this.db;

    try {
      this.db = await Database.load('sqlite:test.db');
      this.isReady.set(true);
      return this.db;
    } catch (e) {
      throw new Error(`Failed to load database: ${e}`);
    }
  }
}
