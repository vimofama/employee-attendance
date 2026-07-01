import { inject, Service, signal } from '@angular/core';
import { DatabaseService } from '@app/shared/service/database';
import { Router } from '@angular/router';
import bcrypt from 'bcryptjs';

interface User {
  id: number;
  username: string;
  role: string;
  password_hash?: string;
}

@Service()
export class AuthService {
  private router = inject(Router);
  databaseService = inject(DatabaseService);
  user = signal<User | null>(null);

  async login(username: string, password: string): Promise<string | null> {
    const result = await this.databaseService.db.select<User[]>(
      'SELECT id, username, role, password_hash FROM users WHERE username = $1',
      [username],
    );

    const dbUser = result[0];

    if (dbUser && dbUser.password_hash) {
      const isMatch = await bcrypt.compare(password, dbUser.password_hash);

      if (isMatch) {
        const { password_hash, ...userSession } = dbUser;

        this.user.set(userSession);
        return userSession.role;
      }
    }
    return null;
  }

  async logout() {
    this.user.set(null);
    await this.router.navigate(['/'], { replaceUrl: true });
  }
}
