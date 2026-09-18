import { Component, DestroyRef, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { SignupService } from './signup.service';
import { LoginService } from '../login/login.service';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'signup',
  styleUrl: './signup.css',
  templateUrl: './signup.html',
})
export class SignupComponent {
  private readonly signupService = inject(SignupService);
  private readonly loginService = inject(LoginService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly isSubmitting = signal(false);
  protected readonly accountCreated = signal(false);
  protected readonly signupForm = new FormGroup({
    firstName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/\S/)],
    }),
    lastName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/\S/)],
    }),
    username: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8), Validators.maxLength(1024)],
    }),
  });
  protected readonly statusMessage = signal('');

  protected onSubmit(): void {
    if (this.isSubmitting() || this.accountCreated()) return;
    this.statusMessage.set('');
    this.signupForm.markAllAsTouched();
    if (this.signupForm.invalid) return;

    const { firstName, lastName, username, password } = this.signupForm.getRawValue();
    this.isSubmitting.set(true);
    this.signupService
      .signup({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        userName: username.trim(),
        password,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSubmitting.set(false)),
      )
      .subscribe({
        next: (user) => {
          this.loginService.setCurrentUser(user);
          this.accountCreated.set(true);
          this.signupForm.controls.password.reset();
          this.statusMessage.set('Account created. Opening your form…');
          void this.router
            .navigateByUrl('/form')
            .then((navigated) => {
              if (!navigated)
                this.statusMessage.set(
                  'Account created. Use the Open form link below to continue.',
                );
            })
            .catch(() => {
              this.statusMessage.set('Account created. Use the Open form link below to continue.');
            });
        },
        error: (error: HttpErrorResponse) => {
          this.statusMessage.set(
            error.status === 409
              ? 'That username is already taken. Please choose another.'
              : error.status === 400
                ? 'Please check your details and password requirements.'
                : error.status === 0
                  ? 'Unable to reach the server. Please try again.'
                  : 'Unable to create your account right now. Please try again later.',
          );
        },
      });
  }
}
