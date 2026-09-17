import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormService, type Color } from './form.service';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-form',
  imports: [ReactiveFormsModule],
  templateUrl: './form.html',
  styleUrl: './form.css',
})
export class FormComponent implements OnInit {
  private readonly formService = inject(FormService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly colors = signal<Color[]>([]);
  protected readonly colorsLoading = signal(true);
  protected readonly colorsError = signal('');
  protected readonly errorMessage = signal('');

  protected readonly surveyForm = new FormGroup({
    color: new FormControl('', { nonNullable: true }),
    firstSurvey: new FormControl<'yes' | 'no' | null>(null),
    wouldRather: new FormControl<'spaghetti' | 'waffles' | null>(null),
    firstName: new FormControl('', { nonNullable: true }),
    lastName: new FormControl('', { nonNullable: true }),
    email: new FormControl('', { nonNullable: true }),
    comments: new FormControl('', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.surveyForm.controls.color.disable();
    this.formService
      .getColors()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (colors) => {
          this.colors.set(colors);
          this.colorsLoading.set(false);
          if (colors.length) this.surveyForm.controls.color.enable();
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

  protected onSubmit(): void {
    this.errorMessage.set('');
    if (this.surveyForm.controls.firstSurvey.value !== 'no') {
      this.errorMessage.set('You must select No to submit.');
      return;
    }
  }
}
