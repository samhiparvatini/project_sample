import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { LoginService } from './login.service';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  return inject(LoginService)
    .verifyToken()
    .pipe(map((valid) => (valid ? true : router.createUrlTree(['/login']))));
};
