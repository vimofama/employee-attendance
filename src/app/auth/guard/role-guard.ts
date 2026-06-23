import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '@app/auth/service/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const currentUser = authService.user();
  const expectedRoles = route.data['roles'] as Array<string>;
  if (currentUser && expectedRoles.includes(currentUser.role.toLowerCase())) {
    return true;
  }
  return router.createUrlTree(['/']);
};
