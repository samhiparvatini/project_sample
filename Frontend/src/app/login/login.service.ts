import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface LoginUser {
  userId: number;
  firstName: string;
  lastName: string;
  userName: string;
}

@Injectable({ providedIn: 'root' })
export class LoginService {
  private readonly http = inject(HttpClient);

  login(userName: string, password: string): Observable<LoginUser> {
    return this.http.post<LoginUser>('http://localhost:3000/api/users/login', {
      userName,
      password,
    });
  }
}
