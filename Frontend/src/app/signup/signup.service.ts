import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { AuthSession } from '../login/login.service';

export interface SignupInput {
  firstName: string;
  lastName: string;
  userName: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class SignupService {
  private readonly http = inject(HttpClient);

  signup(input: SignupInput): Observable<AuthSession> {
    return this.http.post<AuthSession>('http://localhost:3000/api/users', input);
  }
}
