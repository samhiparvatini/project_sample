import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginComponent } from './login.component';

describe('Login form', () => {
  let http: HttpTestingController;
  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  function setup(username = ' sam ', password = ' secret password ') {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    for (const [id, value] of [
      ['username', username],
      ['password', password],
    ]) {
      const input = root.querySelector<HTMLInputElement>(`#${id}`)!;
      input.value = value!;
      input.dispatchEvent(new Event('input'));
    }
    const form = root.querySelector('form')!;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    return { fixture, root, form };
  }

  it('sends credentials once, preserves password spaces, and navigates on success', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const { fixture, root, form } = setup();
    expect(root.querySelector('button')!.disabled).toBe(true);
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const request = http.expectOne('http://localhost:3000/api/users/login');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ userName: 'sam', password: ' secret password ' });
    request.flush({
      userId: 1,
      firstName: 'Sam',
      lastName: 'Test',
      userName: 'sam',
      token: 'test-token',
      expiresAt: Math.floor(Date.now() / 1000) + 1800,
    });
    fixture.detectChanges();
    expect(navigate).toHaveBeenCalledWith('/form');
    expect(root.querySelector<HTMLInputElement>('#password')!.value).toBe('');
  });

  it('displays invalid credentials and allows another attempt', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');
    const { fixture, root } = setup();
    http
      .expectOne('http://localhost:3000/api/users/login')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();
    expect(root.textContent).toContain('Invalid username or password.');
    expect(root.querySelector('button')!.disabled).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not submit an empty form', () => {
    setup('', '');
    http.expectNone('http://localhost:3000/api/users/login');
  });
});
