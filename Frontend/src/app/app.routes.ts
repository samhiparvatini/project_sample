import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { SignupComponent } from './signup/signup.component';
import { WorkspaceComponent } from './workspace/workspace.component';
import { FormComponent } from './form/form.component';
import { LookupComponent } from './lookup/lookup.component';
import { WelcomeComponent } from './form/welcome/welcome.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: '',
    component: WorkspaceComponent,
    children: [
      { path: 'form', component: FormComponent },
      { path: 'lookup', component: LookupComponent },
    ],
  },
  { path: 'welcome', component: WelcomeComponent },
  { path: 'form', component: FormComponent }
  // { path: 'snoopy', component: SnoopyComponent }
];
