import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { CatalogOption } from '../../../core/models/catalog-option.model';
import { ContactType, Student, StudentContact, StudentGender } from '../../../core/models/student.model';
import { CatalogService } from '../../../core/services/catalog.service';
import { CONTACT_NUMBER_PATTERN } from '../../../core/validation/contact-number';

type ContactFormGroup = FormGroup<{
  number: FormControl<string>;
  type: FormControl<ContactType>;
  active: FormControl<boolean>;
}>;

@Component({
  selector: 'app-student-form',
  imports: [
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  templateUrl: './student-form.html',
  styleUrl: './student-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentForm {
  private readonly formBuilder = inject(FormBuilder).nonNullable;
  private readonly catalogService = inject(CatalogService);

  readonly student = input<Student | null>(null);
  readonly idError = input('');
  readonly studentSubmit = output<Student>();
  readonly studentCancel = output<boolean>();
  readonly studentIdChange = output<void>();
  protected readonly validationMessage = signal('');
  protected readonly genders = toSignal(this.catalogService.getGenders(), { initialValue: [] });
  protected readonly contactTypes = toSignal(this.catalogService.getContactTypes(), {
    initialValue: [],
  });

  protected readonly form = this.formBuilder.group({
    id: ['', [Validators.required, Validators.pattern(/^EST-\d{3,}$/i)]],
    firstNames: [
      '',
      [Validators.required, Validators.pattern(/\S/), Validators.minLength(2), Validators.maxLength(80)],
    ],
    lastNames: [
      '',
      [Validators.required, Validators.pattern(/\S/), Validators.minLength(2), Validators.maxLength(80)],
    ],
    birthDate: ['', Validators.required],
    gender: this.formBuilder.control<StudentGender>('' as StudentGender, Validators.required),
    email: ['', [Validators.required, Validators.email, Validators.maxLength(120)]],
    address: [
      '',
      [Validators.required, Validators.pattern(/\S/), Validators.minLength(5), Validators.maxLength(180)],
    ],
    contacts: this.formBuilder.array<ContactFormGroup>([]),
  });

  protected get contacts(): FormArray<ContactFormGroup> {
    return this.form.controls.contacts;
  }

  constructor() {
    effect(() => {
      const student = this.student();
      this.contacts.clear();
      this.form.reset({
        id: student?.id ?? '',
        firstNames: student?.firstNames ?? '',
        lastNames: student?.lastNames ?? '',
        birthDate: student?.birthDate ?? '',
        gender: student?.gender ?? ('' as StudentGender),
        email: student?.email ?? '',
        address: student?.address ?? '',
      });
      student?.contacts.forEach((contact) => this.contacts.push(this.createContact(contact)));
      this.validationMessage.set('');
    });

    effect(() => {
      const control = this.form.controls.id;
      const errors = { ...(control.errors ?? {}) };
      delete errors['server'];

      if (this.idError()) {
        errors['server'] = true;
        control.markAsTouched();
      }

      control.setErrors(Object.keys(errors).length > 0 ? errors : null);
    });
  }

  protected addContact(): void {
    this.contacts.push(this.createContact());
    this.form.markAsDirty();
  }

  protected removeContact(index: number): void {
    this.contacts.removeAt(index);
    this.form.markAsDirty();
  }

  protected cancel(): void {
    this.studentCancel.emit(this.form.dirty);
  }

  protected submit(): void {
    this.form.patchValue({
      id: this.form.controls.id.value.trim().toUpperCase(),
      firstNames: this.form.controls.firstNames.value.trim(),
      lastNames: this.form.controls.lastNames.value.trim(),
      email: this.form.controls.email.value.trim(),
      address: this.form.controls.address.value.trim(),
    });
    this.contacts.controls.forEach((contact) => {
      contact.controls.number.setValue(contact.controls.number.value.trim());
    });

    if (this.form.invalid) {
      this.validationMessage.set('');
      this.form.markAllAsTouched();
      return;
    }

    this.validationMessage.set('Los datos del formulario son válidos.');
    this.studentSubmit.emit(this.form.getRawValue());
  }

  protected reset(): void {
    const student = this.student();
    this.form.reset({
      id: student?.id ?? '',
      firstNames: student?.firstNames ?? '',
      lastNames: student?.lastNames ?? '',
      birthDate: student?.birthDate ?? '',
      gender: student?.gender ?? ('' as StudentGender),
      email: student?.email ?? '',
      address: student?.address ?? '',
    });
    this.contacts.clear();
    student?.contacts.forEach((contact) => this.contacts.push(this.createContact(contact)));
    this.validationMessage.set('');
  }

  protected trackOption(_index: number, option: CatalogOption): string {
    return option.id;
  }

  private createContact(contact?: StudentContact): ContactFormGroup {
    return this.formBuilder.group({
      number: [
        contact?.number ?? '',
        [Validators.required, Validators.pattern(CONTACT_NUMBER_PATTERN)],
      ],
      type: this.formBuilder.control<ContactType>(contact?.type ?? 'movil', Validators.required),
      active: contact?.active ?? true,
    });
  }
}
