import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'app-workspace',
  imports: [NavbarComponent, RouterOutlet],
  template: '<app-navbar /><router-outlet />',
})
export class WorkspaceComponent {}
