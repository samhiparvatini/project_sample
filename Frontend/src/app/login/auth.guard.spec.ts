import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { beforeEach, afterEach, expect, it } from 'vitest';
import { routes } from '../app.routes';
import { LoginService } from './login.service';

beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
  });
});
afterEach(() => TestBed.inject(HttpTestingController).verify());

it('redirects direct anonymous form navigation to login', async () => {
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl('/form');
  expect(TestBed.inject(Router).url).toBe('/login');
  expect(harness.routeNativeElement?.textContent).toContain('Login');
});

it('allows the form after login and blocks it again after logout', async () => {
  const service = TestBed.inject(LoginService);
  const http = TestBed.inject(HttpTestingController);
  const harness = await RouterTestingHarness.create();
  service.login('sam', 'test-password').subscribe();
  http
    .expectOne('http://localhost:3000/api/users/login')
    .flush({ userId: 1, firstName: 'Sam', lastName: 'Test', userName: 'sam' });
  await harness.navigateByUrl('/form');
  expect(TestBed.inject(Router).url).toBe('/form');
  http
    .expectOne('http://localhost:3000/api/forms')
    .flush({ formId: 10, userId: 1, dateCreated: '2026-09-17', statusId: 1 });
  http.expectOne('http://localhost:3000/api/forms/10/answers').flush([]);
  http.expectOne('http://localhost:3000/api/colors').flush([]);
  http
    .expectOne('http://localhost:3000/api/feedback')
    .flush([{ choice: 'Great' }, { choice: 'Okay' }]);
  http.expectOne('http://localhost:3000/api/incons').flush([{ name: 'Wet socks' }]);
  harness.detectChanges();
  const select = harness.routeNativeElement?.querySelector<HTMLSelectElement>('#survey-incon');
  expect(select?.disabled).toBe(false);
  expect(select?.options[1]?.textContent).toContain('Wet socks');
  const radios =
    harness.routeNativeElement!.querySelectorAll<HTMLInputElement>('input[name="feedback"]');
  expect(radios.length).toBe(2);
  radios[0]!.click();

  radios[1]!.click();
  harness.detectChanges();
  expect(radios[0]!.checked).toBe(false);
  expect(radios[1]!.checked).toBe(true);
  service.logout();
  await harness.navigateByUrl('/login');
  await harness.navigateByUrl('/form');
  expect(TestBed.inject(Router).url).toBe('/login');
});
