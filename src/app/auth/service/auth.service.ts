import { inject, Service, signal } from '@angular/core';
import { DatabaseService } from '../../shared/service/database';
import { Router } from '@angular/router';

interface User {
  id: number;
  username: string;
  role: string;
}

@Service()
export class AuthService {
  private router = inject(Router);
  databaseService = inject(DatabaseService);
  user = signal<User | null>(null);

  async login(username: string, password: string) {
    const result = await this.databaseService.db.select<User[]>(
      'SELECT id, username, role FROM users WHERE username = $1 AND password_hash = $2',
      [username, password],
    );
    if (result[0]) {
      this.user.set(result[0]);
      return result[0].role;
    }
    return null;
  }

  async logout() {
    this.user.set(null);
    await this.router.navigate(['/'], { replaceUrl: true });
  }
}
