import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormService,
  type Color,
  type Incon,
  type Feedback,
  type AnswerInput,
  type SavedResponse,
} from './form.service';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { EMPTY, Subject, catchError, concatMap, debounceTime, finalize, map, tap } from 'rxjs';
import { LoginService } from '../login/login.service';

@Component({
  selector: 'app-form',
  imports: [ReactiveFormsModule],
  templateUrl: './form.html',
  styleUrl: './form.css',
})
export class FormComponent implements OnInit {
  private readonly formService = inject(FormService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly loginService = inject(LoginService);
  private readonly answerSaves = new Subject<{
    answers: AnswerInput[];
    statusId: 2 | 3;
    version: number;
  }>();
  private editVersion = 0;
  protected readonly pendingSaves = signal(0);
  protected readonly answersSaved = signal(false);
  protected readonly formId = signal<number | null>(null);
  protected readonly creatingForm = signal(true);
  protected readonly submitting = signal(false);
  protected readonly formStatus = signal(1);
  protected readonly saveError = signal('');
  protected readonly colors = signal<Color[]>([]);
  protected readonly colorsLoading = signal(true);
  protected readonly colorsError = signal('');
  protected readonly incons = signal<Incon[]>([]);
  protected readonly inconsLoading = signal(true);
  protected readonly inconsError = signal('');
  protected readonly feedbackOptions = signal<Feedback[]>([]);
  protected readonly feedbackLoading = signal(true);
  protected readonly feedbackError = signal('');
  protected readonly errorMessage = signal('');

  protected readonly surveyForm = new FormGroup({
    color: new FormControl('', { nonNullable: true }),
    incon: new FormControl('', { nonNullable: true }),
    feedback: new FormControl({ value: '', disabled: true }, { nonNullable: true }),
    firstSurvey: new FormControl<'yes' | 'no' | null>(null),
    wouldRather: new FormControl<'spaghetti' | 'waffles' | null>(null),
    animalRoommate: new FormControl('', { nonNullable: true }),
    tacoCount: new FormControl<number | null>(null, [
      Validators.min(0),
      Validators.pattern(/^\d+$/),
    ]),
  });

  ngOnInit(): void {
    const user = this.loginService.currentUser();
    if (!user) {
      this.creatingForm.set(false);
      this.saveError.set('Please log in before starting a form.');
      return;
    }
    this.answerSaves
      .pipe(
        concatMap(({ answers, statusId, version }) =>
          this.formService.saveAnswers(this.formId()!, answers, statusId).pipe(
            tap((form) => {
              this.formStatus.set(form.statusId);
              this.saveError.set('');
              this.answersSaved.set(version === this.editVersion);
            }),
            catchError(() => {
              this.saveError.set(
                statusId === 3
                  ? 'Unable to complete the form. Please submit again.'
                  : 'Unable to save answers. Edit an answer or submit to retry.',
              );
              return EMPTY;
            }),
            finalize(() => {
              this.pendingSaves.update((count) => count - 1);
              if (statusId === 3) this.submitting.set(false);
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
    this.surveyForm.valueChanges
      .pipe(
        tap(() => {
          this.editVersion += 1;
          this.answersSaved.set(false);
        }),
        debounceTime(400),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.onChange());
    this.formService
      .createForm(user.userId)
      .pipe(
        concatMap((form) =>
          this.formService.getAnswers(form.formId).pipe(map((answers) => ({ form, answers }))),
        ),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.creatingForm.set(false)),
      )
      .subscribe({
        next: ({ form, answers }) => {
          this.restoreAnswers(answers);
          this.formId.set(form.formId);
          this.formStatus.set(form.statusId);
        },
        error: () => this.saveError.set('Unable to create the form. Please refresh to try again.'),
      });
    this.formService
      .getFeedback()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (feedback) => {
          this.feedbackOptions.set(feedback);
          this.feedbackLoading.set(false);
          if (feedback.length) this.surveyForm.controls.feedback.enable({ emitEvent: false });
        },
        error: () => {
          this.feedbackLoading.set(false);
          this.feedbackError.set(
            'Unable to load feedback choices. Please try refreshing the page.',
          );
        },
      });
    this.surveyForm.controls.incon.disable({ emitEvent: false });
    this.formService
      .getIncons()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (incons) => {
          this.incons.set(incons);
          this.inconsLoading.set(false);
          if (incons.length) this.surveyForm.controls.incon.enable({ emitEvent: false });
        },
        error: () => {
          this.inconsLoading.set(false);
          this.inconsError.set('Unable to load inconveniences. Please try refreshing the page.');
        },
      });
    this.surveyForm.controls.color.disable({ emitEvent: false });
    this.formService
      .getColors()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (colors) => {
          this.colors.set(colors);
          this.colorsLoading.set(false);
          if (colors.length) this.surveyForm.controls.color.enable({ emitEvent: false });
        },
        error: () => {
          this.colorsLoading.set(false);
          this.colorsError.set('Unable to load colors. Please try refreshing the page.');
        },
      });
  }

  protected selectFirstSurvey(answer: 'yes' | 'no', event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.surveyForm.controls.firstSurvey.setValue(checked ? answer : null);
    this.surveyForm.controls.firstSurvey.markAsDirty();
    this.surveyForm.controls.firstSurvey.markAsTouched();
  }

  protected selectWouldRather(answer: 'spaghetti' | 'waffles', event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.surveyForm.controls.wouldRather.setValue(checked ? answer : null);
    this.surveyForm.controls.wouldRather.markAsDirty();
    this.surveyForm.controls.wouldRather.markAsTouched();
  }

  private restoreAnswers(answers: SavedResponse[]): void {
    for (const { questionKey, answer } of answers) {
      switch (questionKey) {
        case 'color':
        case 'incon':
        case 'feedback':
        case 'animalRoommate':
          this.surveyForm.controls[questionKey].setValue(answer ?? '', { emitEvent: false });
          break;
        case 'firstSurvey':
          this.surveyForm.controls.firstSurvey.setValue(
            answer === 'Yes' ? 'yes' : answer === 'No' ? 'no' : null,
            { emitEvent: false },
          );
          break;
        case 'wouldRather':
          this.surveyForm.controls.wouldRather.setValue(
            answer === 'Spaghetti for Hair'
              ? 'spaghetti'
              : answer === 'Waffles for Ears'
                ? 'waffles'
                : null,
            { emitEvent: false },
          );
          break;
        case 'tacoCount':
          this.surveyForm.controls.tacoCount.setValue(answer === null ? null : Number(answer), {
            emitEvent: false,
          });
          break;
      }
    }
  }

  private answerSnapshot(): AnswerInput[] {
    const value = this.surveyForm.getRawValue();
    const answers = {
      color: value.color,
      firstSurvey: value.firstSurvey === null ? null : value.firstSurvey === 'yes' ? 'Yes' : 'No',
      wouldRather:
        value.wouldRather === null
          ? null
          : value.wouldRather === 'spaghetti'
            ? 'Spaghetti for Hair'
            : 'Waffles for Ears',
      animalRoommate: value.animalRoommate,
      tacoCount: value.tacoCount,
      incon: value.incon,
      feedback: value.feedback,
    };
    return Object.entries(answers).map(([questionKey, answer]) => ({
      questionKey,
      answer: answer === null || answer === '' ? null : String(answer),
    }));
  }

  private queueSave(statusId: 2 | 3): void {
    this.pendingSaves.update((count) => count + 1);
    this.answerSaves.next({ answers: this.answerSnapshot(), statusId, version: this.editVersion });
  }

  protected onChange(): void {
    if (!this.formId() || this.submitting() || this.formStatus() === 3) return;
    this.queueSave(2);
  }

  protected ngOnSubmit(): void {
    if (!this.formId() || this.submitting() || this.formStatus() === 3) return;
    this.errorMessage.set('');
    if (this.surveyForm.controls.tacoCount.invalid) {
      this.surveyForm.controls.tacoCount.markAsTouched();
      this.errorMessage.set('Enter a whole number of tacos, zero or more.');
      return;
    }
    if (this.surveyForm.controls.firstSurvey.value !== 'no') {
      this.errorMessage.set('You must select No to "Are pineapples on pizza acceptable?" to submit.');
      return;
    }
    this.submitting.set(true);
    this.saveError.set('');
    this.queueSave(3);
  }
}
