import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { LoginService } from '../login/login.service';
import { FormComponent } from './form.component';

const row = { formId: 12, userId: 7, dateCreated: '2026-09-17', statusId: 1 };
const statusUrl = 'http://localhost:3000/api/forms/12/answers';
let http: HttpTestingController;
beforeEach(() => {
  TestBed.configureTestingModule({
    imports: [FormComponent],
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  TestBed.inject(LoginService).setCurrentUser({
    userId: 7,
    userName: 'sam',
    firstName: 'Sam',
    lastName: 'Test',
  });
  http = TestBed.inject(HttpTestingController);
});
afterEach(() => http.verify());
function setup() {
  const fixture = TestBed.createComponent(FormComponent);
  fixture.detectChanges();
  http.expectOne('http://localhost:3000/api/colors').flush([{ name: 'Red' }]);
  http.expectOne('http://localhost:3000/api/incons').flush([{ name: 'Wet socks' }]);
  http.expectOne('http://localhost:3000/api/feedback').flush([{ choice: 'Great' }]);
  const root = fixture.nativeElement as HTMLElement;
  const create = http.expectOne('http://localhost:3000/api/forms');
  expect(create.request.body).toEqual({ userId: 7 });
  return {
    fixture,
    root,
    create,
    submit: () =>
      root
        .querySelector('form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
  };
}

it('creates once and queues completion after the first answer-change update', async () => {
  const { fixture, root, create, submit } = setup();
  create.flush(row);
  http.expectOne(statusUrl).flush([]);
  fixture.detectChanges();
  http.expectNone(statusUrl);
  root.querySelector<HTMLInputElement>('#survey-no')!.click();
  await new Promise((resolve) => setTimeout(resolve, 450));
  const progress = http.expectOne(statusUrl);
  expect(progress.request.method).toBe('PATCH');
  expect(progress.request.body.statusId).toBe(2);
  expect(progress.request.body.answers).toHaveLength(7);
  expect(progress.request.body.answers).toContainEqual({
    questionKey: 'firstSurvey',
    answer: 'No',
  });
  expect(progress.request.body.answers).toContainEqual({ questionKey: 'color', answer: null });
  submit();
  submit();
  http.expectNone(statusUrl);
  progress.flush({ ...row, statusId: 2 });
  const completed = http.expectOne(statusUrl);
  expect(completed.request.body.statusId).toBe(3);
  completed.flush({ ...row, statusId: 3 });
  fixture.detectChanges();
  expect(root.textContent).toContain('Form marked as completed.');
  expect(root.querySelector('fieldset')!.disabled).toBe(true);
  submit();
  http.expectNone(statusUrl);
});

it('shows creation failures without sending status requests', () => {
  const { fixture, root, create, submit } = setup();
  create.flush({}, { status: 500, statusText: 'Error' });
  fixture.detectChanges();
  expect(root.textContent).toContain('Unable to create the form.');
  submit();
  http.expectNone(statusUrl);
});

it('keeps existing validation and allows retry after failed completion', () => {
  const { fixture, root, create, submit } = setup();
  create.flush(row);
  http.expectOne(statusUrl).flush([]);
  fixture.detectChanges();
  submit();
  http.expectNone(statusUrl);
  fixture.detectChanges();
  expect(root.textContent).toContain('You must select No to submit.');
  root.querySelector<HTMLInputElement>('#survey-no')!.click();
  submit();
  http.expectOne(statusUrl).flush({}, { status: 500, statusText: 'Error' });
  fixture.detectChanges();
  expect(root.textContent).toContain('Unable to complete the form.');
  expect(root.querySelector('fieldset')!.disabled).toBe(false);
  submit();
  const retry = http.expectOne(statusUrl);
  expect(retry.request.body.statusId).toBe(3);
  retry.flush({ ...row, statusId: 3 });
});

it('saves zero and clears answers back to null', async () => {
  const { fixture, root, create } = setup();
  create.flush(row);
  http.expectOne(statusUrl).flush([]);
  fixture.detectChanges();
  const tacos = root.querySelector<HTMLInputElement>('#survey-tacos')!;
  tacos.value = '0';
  tacos.dispatchEvent(new Event('input'));
  await new Promise((resolve) => setTimeout(resolve, 450));
  const save = http.expectOne(statusUrl);
  expect(save.request.body.answers).toContainEqual({ questionKey: 'tacoCount', answer: '0' });
  save.flush({ ...row, statusId: 2 });
  tacos.value = '';
  tacos.dispatchEvent(new Event('input'));
  await new Promise((resolve) => setTimeout(resolve, 450));
  const clear = http.expectOne(statusUrl);
  expect(clear.request.body.answers).toContainEqual({ questionKey: 'tacoCount', answer: null });
  clear.flush({ ...row, statusId: 2 });
});

it('does not report older saves as saving newer edits', async () => {
  const { fixture, root, create } = setup();
  create.flush(row);
  http.expectOne(statusUrl).flush([]);
  fixture.detectChanges();
  const animal = root.querySelector<HTMLInputElement>('#survey-roommate')!;
  animal.value = 'cat';
  animal.dispatchEvent(new Event('input'));
  await new Promise((resolve) => setTimeout(resolve, 450));
  const first = http.expectOne(statusUrl);
  animal.value = 'tiger';
  animal.dispatchEvent(new Event('input'));
  first.flush({ ...row, statusId: 2 });
  fixture.detectChanges();
  expect(root.textContent).not.toContain('Answers saved.');
  await new Promise((resolve) => setTimeout(resolve, 450));
  const latest = http.expectOne(statusUrl);
  expect(latest.request.body.answers).toContainEqual({
    questionKey: 'animalRoommate',
    answer: 'tiger',
  });
  latest.flush({ ...row, statusId: 2 });
  fixture.detectChanges();
  expect(root.textContent).toContain('Answers saved.');
});

it('restores existing answers without saving over them on initialization', () => {
  const { fixture, root, create } = setup();
  create.flush({ ...row, statusId: 2 });
  http.expectOne(statusUrl).flush([
    { id: 1, formId: 12, questionKey: 'tacoCount', question: 'Tacos?', answer: '0' },
    { id: 2, formId: 12, questionKey: 'firstSurvey', question: 'Pineapple?', answer: 'No' },
  ]);
  fixture.detectChanges();
  expect(root.querySelector<HTMLInputElement>('#survey-tacos')!.value).toBe('0');
  expect(root.querySelector<HTMLInputElement>('#survey-no')!.checked).toBe(true);
  http.expectNone(statusUrl);
});
