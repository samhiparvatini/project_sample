import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, map, of, shareReplay, tap, throwError } from 'rxjs';

export interface LoginUser {
  userId: number;
  firstName: string;
  lastName: string;
  userName: string;
}
export interface AuthSession extends LoginUser {
  token: string;
  expiresAt: number;
}

@Injectable({ providedIn: 'root' })
export class LoginService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly user = signal<LoginUser | null>(null);
  private token: string | null = this.readToken();
  private expiresAt = 0;
  private expirationTimer?: ReturnType<typeof setTimeout>;
  private verification?: Observable<boolean>;
  readonly currentUser = this.user.asReadonly();
  readonly isLoggedIn = computed(() => this.user() !== null);

  constructor() {
    // Stored booleans never establish authentication. Restore by verifying the token.
    this.store('isLoggedIn', 'false');
    inject(DestroyRef).onDestroy(() => clearTimeout(this.expirationTimer));
  }

  private readToken(): string | null {
    try {
      return sessionStorage.getItem('authToken');
    } catch {
      return null;
    }
  }

  private store(key: string, value: string | null): void {
    try {
      if (value === null) sessionStorage.removeItem(key);
      else sessionStorage.setItem(key, value);
    } catch {
      /* Memory-only session when browser storage is unavailable. */
    }
  }

  establishSession(session: AuthSession): void {
    if (
      !session.token ||
      !Number.isFinite(session.expiresAt) ||
      session.expiresAt * 1000 <= Date.now()
    ) {
      this.clearSession();
      throw new Error('Invalid authentication response');
    }
    this.token = session.token;
    this.expiresAt = session.expiresAt;
    this.user.set({
      userId: session.userId,
      firstName: session.firstName,
      lastName: session.lastName,
      userName: session.userName,
    });
    this.store('authToken', session.token);
    this.store('isLoggedIn', 'true');
    clearTimeout(this.expirationTimer);
    this.expirationTimer = setTimeout(
      () => this.expireSession(),
      Math.max(0, session.expiresAt * 1000 - Date.now()),
    );
  }

  getToken(): string | null {
    if (this.expiresAt && this.expiresAt * 1000 <= Date.now()) {
      this.expireSession();
      return null;
    }
    return this.token;
  }

  verifyToken(): Observable<boolean> {
    const token = this.getToken();
    if (!token) {
      this.clearSession();
      return of(false);
    }
    if (this.isLoggedIn()) return of(true);
    if (this.verification) return this.verification;
    this.verification = this.http
      .get<LoginUser & { expiresAt: number }>('http://localhost:3000/api/users/verify', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .pipe(
        map((user) => {
          if (this.token !== token) return false;
          this.establishSession({ ...user, token });
          return true;
        }),
        catchError(() => {
          if (this.token === token) this.clearSession();
          return of(false);
        }),
        finalize(() => {
          this.verification = undefined;
        }),
        shareReplay({ bufferSize: 1, refCount: true }),
      );
    return this.verification;
  }

  logout(): Observable<void> {
    const token = this.getToken();
    if (!token) {
      this.clearSession();
      return of(undefined);
    }
    return this.http
      .post<void>(
        'http://localhost:3000/api/users/logout',
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      )
      .pipe(
        catchError((error: HttpErrorResponse) => {
          // Expired or already-revoked tokens cannot authenticate again.
          if (error.status === 401) return of(undefined);
          return throwError(() => error);
        }),
        tap(() => {
          if (this.token === token) this.clearSession();
        }),
      );
  }

  clearSession(): void {
    clearTimeout(this.expirationTimer);
    this.token = null;
    this.expiresAt = 0;
    this.user.set(null);
    this.store('authToken', null);
    this.store('isLoggedIn', 'false');
  }

  expireSession(): void {
    this.clearSession();
    void this.router.navigateByUrl('/login').catch(() => {});
  }

  login(userName: string, password: string): Observable<AuthSession> {
    return this.http
      .post<AuthSession>('http://localhost:3000/api/users/login', { userName, password })
      .pipe(tap((session) => this.establishSession(session)));
  }
}
