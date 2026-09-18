import { Component, input } from '@angular/core';

export interface ResponseRow {
  question: string;
  answer: string | null;
}

@Component({
  selector: 'app-response',
  templateUrl: './response.html',
  styleUrl: './response.css',
})
export class ResponseComponent {
  readonly username = input('username');
  readonly responses = input<ResponseRow[]>([]);
}
