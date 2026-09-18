import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { LookupComponent } from './lookup.component';

beforeEach(() =>
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'lookup', component: LookupComponent }]),
      provideHttpClient(),
      provideHttpClientTesting(),
    ],
  }),
);
afterEach(() => TestBed.inject(HttpTestingController).verify());

it('groups forms by user and displays the selected record without creating a form', async () => {
  const harness = await RouterTestingHarness.create('/lookup?formId=12');
  const http = TestBed.inject(HttpTestingController);
  const request = http.expectOne('http://localhost:3000/api/forms');
  expect(request.request.method).toBe('GET');
  request.flush([
    {
      formId: 12,
      userId: 7,
      userName: 'sam',
      dateCreated: '2026-09-17',
      statusId: 3,
      statusName: 'Completed',
    },
    {
      formId: 11,
      userId: 7,
      userName: 'sam',
      dateCreated: '2026-09-16',
      statusId: 1,
      statusName: 'Initialized',
    },
  ]);
  http
    .expectOne('http://localhost:3000/api/forms/12/answers')
    .flush([
      {
        id: 1,
        formId: 12,
        questionKey: 'color',
        question: 'What is your favorite color?',
        answer: 'Red',
      },
    ]);
  harness.detectChanges();
  const root = harness.routeNativeElement!;
  expect(root.querySelectorAll('.lookup-table tbody tr').length).toBe(2);
  expect(root.querySelector('tbody th')?.getAttribute('rowspan')).toBe('2');
  expect(root.querySelector('tbody a')?.textContent?.trim()).toBe('Form #12');
  expect(root.querySelector('tbody tr td:last-child')?.textContent?.trim()).toBe('Completed');
  expect(root.querySelectorAll('tbody a').length).toBe(2);
  expect(root.querySelector('tbody a')?.getAttribute('href')).toBe('/lookup?formId=12');
  expect(root.querySelector('#form-details-heading')?.textContent).toContain('Form #12');
  expect(root.textContent).toContain('Completed');
});

it('shows a load error instead of an empty-data message', async () => {
  const harness = await RouterTestingHarness.create('/lookup');
  TestBed.inject(HttpTestingController)
    .expectOne('http://localhost:3000/api/forms')
    .flush({}, { status: 500, statusText: 'Error' });
  harness.detectChanges();
  expect(harness.routeNativeElement?.textContent).toContain('Unable to load forms.');
  expect(harness.routeNativeElement?.textContent).not.toContain('No user responses available yet.');
});
