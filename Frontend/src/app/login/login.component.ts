import { Component, DestroyRef, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { LoginService } from './login.service';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'login',
  styleUrl: './login.css',
  templateUrl: './login.html',
})
export class LoginComponent {
  private readonly loginService = inject(LoginService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly isSubmitting = signal(false);
  protected readonly loginForm = new FormGroup({
    username: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/\S/)],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });
  protected readonly statusMessage = signal('');

  protected onSubmit(): void {
    if (this.isSubmitting()) return;
    this.statusMessage.set('');
    this.loginForm.markAllAsTouched();
    if (this.loginForm.invalid) return;

    const { username, password } = this.loginForm.getRawValue();
    this.isSubmitting.set(true);
    this.loginService
      .login(username.trim(), password)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSubmitting.set(false)),
      )
      .subscribe({
        next: () => {
          this.loginForm.controls.password.reset();
          void this.router
            .navigateByUrl('/form')
            .then((navigated) => {
              if (!navigated)
                this.statusMessage.set(
                  'Login verified, but the form could not be opened. Please try again.',
                );
            })
            .catch(() => {
              this.statusMessage.set(
                'Login verified, but the form could not be opened. Please try again.',
              );
            });
        },
        error: (error: HttpErrorResponse) => {
          this.statusMessage.set(
            error.status === 401
              ? 'Invalid username or password.'
              : error.status === 400
                ? 'Please check your username and password.'
                : error.status === 0
                  ? 'Unable to reach the server. Please try again.'
                  : 'Unable to log in right now. Please try again later.',
          );
        },
      });
  }
}
