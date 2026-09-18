import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Color {
  name: string;
}

export interface Incon {
  name: string;
}

export interface Feedback {
  choice: string;
}

export interface FormRecord {
  formId: number;
  userId: number;
  dateCreated: string;
  statusId: number;
}

export interface FormListRecord extends FormRecord {
  userName: string;
  statusName: string | null;
}

export interface AnswerInput {
  questionKey: string;
  answer: string | null;
}

export interface SavedResponse extends AnswerInput {
  id: number;
  formId: number;
  question: string;
}

@Injectable({ providedIn: 'root' })
export class FormService {
  private readonly http = inject(HttpClient);

  saveAnswers(formId: number, answers: AnswerInput[], statusId: 2 | 3): Observable<FormRecord> {
    return this.http.patch<FormRecord>(`http://localhost:3000/api/forms/${formId}/answers`, {
      answers,
      statusId,
    });
  }

  getAnswers(formId: number): Observable<SavedResponse[]> {
    return this.http.get<SavedResponse[]>(`http://localhost:3000/api/forms/${formId}/answers`);
  }

  getForms(): Observable<FormListRecord[]> {
    return this.http.get<FormListRecord[]>('http://localhost:3000/api/forms');
  }

  createForm(userId: number): Observable<FormRecord> {
    return this.http.post<FormRecord>('http://localhost:3000/api/forms', { userId });
  }

  updateFormStatus(formId: number, statusId: 2 | 3): Observable<FormRecord> {
    return this.http.patch<FormRecord>(`http://localhost:3000/api/forms/${formId}/status`, {
      statusId,
    });
  }

  getColors(): Observable<Color[]> {
    return this.http.get<Color[]>('http://localhost:3000/api/colors');
  }

  getIncons(): Observable<Incon[]> {
    return this.http.get<Incon[]>('http://localhost:3000/api/incons');
  }

  getFeedback(): Observable<Feedback[]> {
    return this.http.get<Feedback[]>('http://localhost:3000/api/feedback');
  }
}
