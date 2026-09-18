import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { expect, it, vi } from 'vitest';
import { NavbarComponent } from './navbar.component';
import { LoginService } from '../login/login.service';

it('greets the verified user and clears their profile when logging out', async () => {
  sessionStorage.clear();
  await TestBed.configureTestingModule({
    imports: [NavbarComponent],
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
  }).compileComponents();
  const service = TestBed.inject(LoginService);
  const http = TestBed.inject(HttpTestingController);
  service.login('sam', 'password').subscribe();
  http.expectOne('http://localhost:3000/api/users/login').flush({
    userId: 1,
    firstName: 'Sam',
    lastName: 'Test',
    userName: 'sam',
    token: 'test-token',
    expiresAt: Math.floor(Date.now() / 1000) + 1800,
  });
  const fixture = TestBed.createComponent(NavbarComponent);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  expect(root.textContent).toContain('Welcome, Sam');
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  root.querySelector<HTMLButtonElement>('.logout-button')!.click();
  expect(service.currentUser()).not.toBeNull();
  http
    .expectOne('http://localhost:3000/api/users/logout')
    .flush(null, { status: 204, statusText: 'No Content' });
  fixture.detectChanges();
  expect(service.currentUser()).toBeNull();
  expect(root.textContent).not.toContain('Welcome, Sam');
  expect(navigate).toHaveBeenCalled();
  const destination = navigate.mock.calls[0]![0];
  expect(destination.toString()).toBe('/login');
  http.verify();
});
