import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { LoginService } from './login.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  // Never send the token to another origin or attach it to public login/signup calls.
  if (!request.url.startsWith('http://localhost:3000/api/')) return next(request);
  if (
    request.method === 'POST' &&
    ['http://localhost:3000/api/users', 'http://localhost:3000/api/users/login'].includes(
      request.url,
    )
  )
    return next(request);
  const auth = inject(LoginService);
  const token = auth.getToken();
  const authenticated = token
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;
  return next(authenticated).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && token && auth.getToken() === token) auth.expireSession();
      return throwError(() => error);
    }),
  );
};
