import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SignupComponent } from './signup.component';

describe('Signup form', () => {
  let http: HttpTestingController;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SignupComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  function setup(password = ' secret password ') {
    const fixture = TestBed.createComponent(SignupComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    for (const [name, value] of Object.entries({
      firstName: ' Sam ',
      lastName: ' Test ',
      username: ' sam ',
      password,
    })) {
      const input = root.querySelector<HTMLInputElement>(`#signup-${name}`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    const form = root.querySelector('form')!;
    const submit = () =>
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    submit();
    fixture.detectChanges();
    return { fixture, root, submit };
  }

  it('posts the expected payload once and navigates to login after creation', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const { fixture, root, submit } = setup();
    expect(root.querySelector('button')!.disabled).toBe(true);
    submit();
    const request = http.expectOne('http://localhost:3000/api/users');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      firstName: 'Sam',
      lastName: 'Test',
      userName: 'sam',
      password: ' secret password ',
    });
    request.flush(
      { userId: 1, firstName: 'Sam', lastName: 'Test', userName: 'sam' },
      { status: 201, statusText: 'Created' },
    );
    fixture.detectChanges();
    expect(navigate).toHaveBeenCalledWith('/login');
    expect(root.querySelector<HTMLInputElement>('#signup-password')!.value).toBe('');
    submit();
    http.expectNone('http://localhost:3000/api/users');
  });

  it('shows duplicate username errors and allows retrying', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');
    const { fixture, root } = setup();
    http
      .expectOne('http://localhost:3000/api/users')
      .flush({}, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();
    expect(root.textContent).toContain('That username is already taken.');
    expect(root.querySelector('button')!.disabled).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not submit a short password', () => {
    setup('short');
    http.expectNone('http://localhost:3000/api/users');
  });

  it('shows connection failures without navigating', () => {
    const { fixture, root } = setup();
    http.expectOne('http://localhost:3000/api/users').error(new ProgressEvent('error'));
    fixture.detectChanges();
    expect(root.textContent).toContain('Unable to reach the server.');
    expect(root.querySelector('button')!.disabled).toBe(false);
  });
});
