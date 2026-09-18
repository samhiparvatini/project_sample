import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface LoginUser {
  userId: number;
  firstName: string;
  lastName: string;
  userName: string;
}

@Injectable({ providedIn: 'root' })
export class LoginService {
  private readonly http = inject(HttpClient);
  private readonly user = signal<LoginUser | null>(null);
  readonly currentUser = this.user.asReadonly();

  setCurrentUser(user: LoginUser): void {
    this.user.set(user);
  }

  logout(): void {
    this.user.set(null);
  }

  login(userName: string, password: string): Observable<LoginUser> {
    return this.http
      .post<LoginUser>('http://localhost:3000/api/users/login', {
        userName,
        password,
      })
      .pipe(tap((user) => this.setCurrentUser(user)));
  }
}
