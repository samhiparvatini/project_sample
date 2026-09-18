import { Component, inject } from '@angular/core';
import { LoginService } from '../login/login.service';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class NavbarComponent {
  private readonly loginService = inject(LoginService);
  protected readonly currentUser = this.loginService.currentUser;

  protected logout(): void {
    this.loginService.logout();
  }
}
