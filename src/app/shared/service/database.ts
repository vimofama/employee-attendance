import { OnInit, Service, signal } from '@angular/core';

import Database from '@tauri-apps/plugin-sql';

@Service()
export class DatabaseService{
  isReady = signal<boolean>(false);
  db!: Database;

  constructor() {
    this.initDatabase();
  }

  private async initDatabase() {
    try {
      this.db = await Database.load('sqlite:test.db');
      this.isReady.set(true);
      console.log('Database initialized successfully');
    } catch (e) {
      console.log('Error initializing database:', e);
    }
  }
}
