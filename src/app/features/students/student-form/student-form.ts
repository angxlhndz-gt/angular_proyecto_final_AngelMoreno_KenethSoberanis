import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
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
import { Student, StudentGender, ContactType } from '../../../core/models/student.model';
import { CatalogService } from '../../../core/services/catalog.service';

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

  readonly studentSubmit = output<Student>();
  protected readonly validationMessage = signal('');
  protected readonly genders = toSignal(this.catalogService.getGenders(), { initialValue: [] });
  protected readonly contactTypes = toSignal(this.catalogService.getContactTypes(), {
    initialValue: [],
  });

  protected readonly form = this.formBuilder.group({
    id: ['', [Validators.required, Validators.pattern(/^EST-\d{3,}$/i)]],
    firstNames: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    lastNames: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    birthDate: ['', Validators.required],
    gender: this.formBuilder.control<StudentGender>('' as StudentGender, Validators.required),
    email: ['', [Validators.required, Validators.email, Validators.maxLength(120)]],
    address: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(180)]],
    contacts: this.formBuilder.array<ContactFormGroup>([]),
  });

  protected get contacts(): FormArray<ContactFormGroup> {
    return this.form.controls.contacts;
  }

  protected addContact(): void {
    this.contacts.push(
      this.formBuilder.group({
        number: ['', [Validators.required, Validators.pattern(/^[+0-9() -]{7,20}$/)]],
        type: this.formBuilder.control<ContactType>('movil', Validators.required),
        active: true,
      }),
    );
  }

  protected removeContact(index: number): void {
    this.contacts.removeAt(index);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.validationMessage.set('');
      this.form.markAllAsTouched();
      return;
    }

    this.validationMessage.set('Los datos del formulario son válidos.');
    this.studentSubmit.emit(this.form.getRawValue());
  }

  protected reset(): void {
    this.validationMessage.set('');
    this.form.reset({
      id: '',
      firstNames: '',
      lastNames: '',
      birthDate: '',
      gender: '' as StudentGender,
      email: '',
      address: '',
    });
    this.contacts.clear();
  }

  protected trackOption(_index: number, option: CatalogOption): string {
    return option.id;
  }
}
