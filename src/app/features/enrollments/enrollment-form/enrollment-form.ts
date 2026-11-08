import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';

import { Enrollment, EnrollmentStatus } from '../../../core/models/enrollment.model';
import { Student } from '../../../core/models/student.model';
import { CatalogService } from '../../../core/services/catalog.service';
import { EnrollmentService } from '../../../core/services/enrollment.service';
import { StudentService } from '../../../core/services/student.service';

@Component({
  selector: 'app-enrollment-form',
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './enrollment-form.html',
  styleUrl: './enrollment-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnrollmentForm {
  private readonly formBuilder = inject(FormBuilder).nonNullable;
  private readonly catalogService = inject(CatalogService);
  private readonly studentService = inject(StudentService);
  private readonly enrollmentService = inject(EnrollmentService);

  protected readonly students = signal<Student[]>([]);
  protected readonly periods = toSignal(this.catalogService.getPeriods(), { initialValue: [] });
  protected readonly courses = toSignal(this.catalogService.getCourses(), { initialValue: [] });
  protected readonly statuses = toSignal(this.catalogService.getEnrollmentStatuses(), {
    initialValue: [],
  });
  protected readonly referenceErrors = signal<string[]>([]);
  protected readonly duplicateIdError = signal('');
  protected readonly storageError = signal('');
  protected readonly successMessage = signal('');

  protected readonly form = this.formBuilder.group({
    id: ['', [Validators.required, Validators.pattern(/^INS-\d{3,}$/i)]],
    studentId: ['', Validators.required],
    periodId: ['', Validators.required],
    courseIds: this.formBuilder.control<string[]>([], Validators.required),
    status: this.formBuilder.control<EnrollmentStatus>('' as EnrollmentStatus, Validators.required),
  });

  constructor() {
    afterNextRender(() => this.students.set(this.studentService.getAll()));
  }

  protected submit(): void {
    this.clearMessages();
    this.form.controls.id.setValue(this.form.controls.id.value.trim().toUpperCase());

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const enrollment = this.form.getRawValue();
    const referenceErrors = this.getReferenceErrors(enrollment);
    if (referenceErrors.length > 0) {
      this.referenceErrors.set(referenceErrors);
      return;
    }

    const existingEnrollments = this.enrollmentService.getAll();
    const duplicate = existingEnrollments.some(
      (existing) => existing.id.trim().toUpperCase() === enrollment.id,
    );
    if (duplicate) {
      this.duplicateIdError.set('Ese código ya corresponde a otra inscripción.');
      this.form.controls.id.setErrors({ duplicate: true });
      this.form.controls.id.markAsTouched();
      return;
    }

    if (!this.enrollmentService.saveAll([...existingEnrollments, enrollment])) {
      this.storageError.set(
        'No se pudo guardar la inscripción en este navegador. Libera espacio e inténtalo de nuevo.',
      );
      return;
    }

    this.successMessage.set('Inscripción registrada correctamente.');
    this.form.reset({
      id: '',
      studentId: '',
      periodId: '',
      courseIds: [],
      status: '' as EnrollmentStatus,
    });
  }

  protected clearMessages(): void {
    this.referenceErrors.set([]);
    this.duplicateIdError.set('');
    this.storageError.set('');
    this.successMessage.set('');
  }

  private getReferenceErrors(enrollment: Enrollment): string[] {
    const errors: string[] = [];

    if (!this.students().some((student) => student.id === enrollment.studentId)) {
      errors.push('El estudiante seleccionado ya no está disponible. Elige un estudiante registrado.');
    }

    if (!this.periods().some((period) => period.id === enrollment.periodId)) {
      errors.push('El período seleccionado no existe en el catálogo.');
    }

    const availableCourseIds = new Set(this.courses().map((course) => course.id));
    if (
      enrollment.courseIds.length === 0 ||
      new Set(enrollment.courseIds).size !== enrollment.courseIds.length ||
      enrollment.courseIds.some((courseId) => !availableCourseIds.has(courseId))
    ) {
      errors.push('Selecciona uno o más cursos válidos del catálogo.');
    }

    if (!this.statuses().some((status) => status.id === enrollment.status)) {
      errors.push('El estado seleccionado no existe en el catálogo.');
    }

    return errors;
  }
}
