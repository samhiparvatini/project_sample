import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface UserFormsRow {
  userId: number;
  username: string;
  forms: { id: number; title: string; route: string }[];
}

@Component({
  selector: 'app-lookup',
  imports: [RouterLink],
  templateUrl: './lookup.html',
  styleUrl: './lookup.css',
})
export class LookupComponent {
  protected readonly users = signal<UserFormsRow[]>([]);
}
