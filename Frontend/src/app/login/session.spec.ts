import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LoginService } from './login.service';
import { authInterceptor } from './auth.interceptor';

const profile = { userId: 7, userName: 'sam', firstName: 'Sam', lastName: 'Test' };
const session = () => ({
  ...profile,
  token: 'signed-test-token',
  expiresAt: Math.floor(Date.now() / 1000) + 1800,
});
let http: HttpTestingController;
beforeEach(() => {
  sessionStorage.clear();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(withInterceptors([authInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  http = TestBed.inject(HttpTestingController);
});
afterEach(() => {
  http.verify();
  vi.useRealTimers();
  sessionStorage.clear();
});

it('does not trust isLoggedIn from sessionStorage without a verified token', () => {
  sessionStorage.setItem('isLoggedIn', 'true');
  const auth = TestBed.inject(LoginService);
  auth.verifyToken().subscribe((valid) => expect(valid).toBe(false));
  expect(auth.isLoggedIn()).toBe(false);
  expect(sessionStorage.getItem('isLoggedIn')).toBe('false');
});

it('restores the browser session only after backend verification and shares pending verification', () => {
  sessionStorage.setItem('authToken', 'saved-token');
  const auth = TestBed.inject(LoginService);
  expect(auth.isLoggedIn()).toBe(false);
  auth.verifyToken().subscribe((valid) => expect(valid).toBe(true));
  auth.verifyToken().subscribe((valid) => expect(valid).toBe(true));
  const request = http.expectOne('http://localhost:3000/api/users/verify');
  expect(request.request.headers.get('Authorization')).toBe('Bearer saved-token');
  request.flush({ ...profile, expiresAt: session().expiresAt });
  expect(auth.currentUser()).toEqual(profile);
  expect(auth.isLoggedIn()).toBe(true);
  expect(sessionStorage.getItem('isLoggedIn')).toBe('true');
});

it('removes an invalid token after verification fails', () => {
  sessionStorage.setItem('authToken', 'invalid-token');
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  const auth = TestBed.inject(LoginService);
  auth.verifyToken().subscribe((valid) => expect(valid).toBe(false));
  http
    .expectOne('http://localhost:3000/api/users/verify')
    .flush({}, { status: 401, statusText: 'Unauthorized' });
  expect(auth.isLoggedIn()).toBe(false);
  expect(sessionStorage.getItem('authToken')).toBeNull();
  expect(navigate).toHaveBeenCalledWith('/login');
});

it('adds a token only to our protected API calls and clears the session on 401', () => {
  const auth = TestBed.inject(LoginService);
  auth.establishSession(session());
  const client = TestBed.inject(HttpClient);
  client.get('https://example.com/api/forms').subscribe();
  const external = http.expectOne('https://example.com/api/forms');
  expect(external.request.headers.has('Authorization')).toBe(false);
  external.flush([]);
  vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  client.get('http://localhost:3000/api/forms').subscribe({ error: () => {} });
  const request = http.expectOne('http://localhost:3000/api/forms');
  expect(request.request.headers.get('Authorization')).toBe('Bearer signed-test-token');
  request.flush({}, { status: 401, statusText: 'Unauthorized' });
  expect(auth.currentUser()).toBeNull();
  expect(sessionStorage.getItem('isLoggedIn')).toBe('false');
});

it('expires sessions automatically and clears tokens on logout', () => {
  vi.useFakeTimers();
  const auth = TestBed.inject(LoginService);
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  auth.establishSession({ ...session(), expiresAt: Math.floor(Date.now() / 1000) + 1 });
  vi.advanceTimersByTime(1100);
  expect(auth.isLoggedIn()).toBe(false);
  expect(sessionStorage.getItem('authToken')).toBeNull();
  expect(navigate).toHaveBeenCalledWith('/login');
  auth.establishSession(session());
  auth.logout().subscribe();
  http
    .expectOne('http://localhost:3000/api/users/logout')
    .flush(null, { status: 204, statusText: 'No Content' });
  expect(auth.getToken()).toBeNull();
  expect(sessionStorage.getItem('isLoggedIn')).toBe('false');
});

it('keeps the token available to retry when backend logout fails', () => {
  const auth = TestBed.inject(LoginService);
  auth.establishSession(session());
  let failed = false;
  auth.logout().subscribe({
    error: () => {
      failed = true;
    },
  });
  const request = http.expectOne('http://localhost:3000/api/users/logout');
  expect(request.request.headers.get('Authorization')).toBe('Bearer signed-test-token');
  request.flush({}, { status: 503, statusText: 'Unavailable' });
  expect(failed).toBe(true);
  expect(auth.isLoggedIn()).toBe(true);
  expect(sessionStorage.getItem('authToken')).toBe('signed-test-token');
});

it('clears the session when logout finds the token already invalid', () => {
  const auth = TestBed.inject(LoginService);
  auth.establishSession(session());
  vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  auth.logout().subscribe();
  http
    .expectOne('http://localhost:3000/api/users/logout')
    .flush({}, { status: 401, statusText: 'Unauthorized' });
  expect(auth.isLoggedIn()).toBe(false);
  expect(sessionStorage.getItem('authToken')).toBeNull();
});
