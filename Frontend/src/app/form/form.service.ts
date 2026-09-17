import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Color {
  name: string;
}

@Injectable({ providedIn: 'root' })
export class FormService {
  private readonly http = inject(HttpClient);

  getColors(): Observable<Color[]> {
    return this.http.get<Color[]>('http://localhost:3000/api/colors');
  }
}
