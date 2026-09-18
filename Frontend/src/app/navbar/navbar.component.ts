import { finalize } from 'rxjs';
import { Component, inject, signal } from '@angular/core';
import { LoginService } from '../login/login.service';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class NavbarComponent {
  private readonly loginService = inject(LoginService);
  private readonly router = inject(Router);
  protected readonly loggingOut = signal(false);
  protected readonly logoutError = signal('');
  protected readonly currentUser = this.loginService.currentUser;

  protected logout(): void {
    if (this.loggingOut()) return;
    this.loggingOut.set(true);
    this.logoutError.set('');
    this.loginService
      .logout()
      .pipe(finalize(() => this.loggingOut.set(false)))
      .subscribe({
        next: () => {
          void this.router.navigateByUrl('/login').catch(() => {
            this.logoutError.set('Logged out. Open the login page to continue.');
          });
        },
        error: () => this.logoutError.set('Unable to log out. Please try again.'),
      });
  }
}
