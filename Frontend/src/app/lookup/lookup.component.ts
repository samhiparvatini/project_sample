import { catchError, of, switchMap, tap } from 'rxjs';
import { ResponseComponent, type ResponseRow } from './response/response.component';
import { Component, DestroyRef, inject, OnInit, computed, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormService, type FormListRecord } from '../form/form.service';

export interface UserFormsRow {
  userId: number;
  username: string;
  forms: { id: number; title: string; status: string }[];
}

@Component({
  selector: 'app-lookup',
  imports: [RouterLink, ResponseComponent],
  templateUrl: './lookup.html',
  styleUrl: './lookup.css',
})
export class LookupComponent implements OnInit {
  private readonly formService = inject(FormService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly forms = signal<FormListRecord[]>([]);
  protected readonly responses = signal<ResponseRow[]>([]);
  protected readonly answersLoading = signal(false);
  protected readonly answersError = signal('');
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly selectedId = signal<number | null>(null);
  protected readonly selectedForm = computed(() =>
    this.forms().find((form) => form.formId === this.selectedId()),
  );
  protected readonly users = computed(() => {
    const grouped = new Map<number, UserFormsRow>();
    for (const form of this.forms()) {
      let user = grouped.get(form.userId);
      if (!user) {
        user = { userId: form.userId, username: form.userName, forms: [] };
        grouped.set(form.userId, user);
      }
      user.forms.push({
        id: form.formId,
        title: `Form #${form.formId}`,
        status: form.statusName ?? 'Unknown status',
      });
    }
    return [...grouped.values()];
  });

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(
        tap((params) => {
          const id = params.get('formId');
          this.selectedId.set(id === null ? null : Number(id));
          this.responses.set([]);
          this.answersError.set('');
        }),
        switchMap(() => {
          const id = this.selectedId();
          if (id === null || !Number.isSafeInteger(id) || id <= 0) {
            this.answersLoading.set(false);
            return of([]);
          }
          this.answersLoading.set(true);
          return this.formService.getAnswers(id).pipe(
            catchError(() => {
              this.answersError.set('Unable to load answers. Please refresh to try again.');
              return of([]);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((answers) => {
        this.responses.set(answers);
        this.answersLoading.set(false);
      });
    this.formService
      .getForms()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (forms) => {
          this.forms.set(forms);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.errorMessage.set('Unable to load forms. Please refresh to try again.');
        },
      });
  }
}
