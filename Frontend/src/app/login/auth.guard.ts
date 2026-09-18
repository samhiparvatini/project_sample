import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { LoginService } from './login.service';

export const authGuard: CanActivateFn = () => {
  return inject(LoginService).currentUser() !== null
    ? true
    : inject(Router).createUrlTree(['/login']);
};
