import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';

import { Enrollment, EnrollmentStatus } from '../../../core/models/enrollment.model';
import { Student } from '../../../core/models/student.model';
import { ApplicationDataService } from '../../../core/services/application-data.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { EnrollmentService } from '../../../core/services/enrollment.service';
import { StudentService } from '../../../core/services/student.service';
import { ConfirmDialog, ConfirmDialogData } from '../../../shared/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-enrollment-form',
  imports: [
    MatButtonModule,
    MatDialogModule,
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
  private readonly applicationData = inject(ApplicationDataService);
  private readonly catalogService = inject(CatalogService);
  private readonly studentService = inject(StudentService);
  private readonly enrollmentService = inject(EnrollmentService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly students = signal<Student[]>([]);
  protected readonly enrollments = signal<Enrollment[]>([]);
  protected readonly hasLoaded = signal(false);
  protected readonly showForm = signal(false);
  protected readonly editingEnrollment = signal<Enrollment | null>(null);
  protected readonly expandedEnrollmentId = signal<string | null>(null);
  protected readonly searchTerm = signal('');
  protected readonly studentFilter = signal('todos');
  protected readonly periodFilter = signal('todos');
  protected readonly statusFilter = signal('todos');
  protected readonly periods = toSignal(this.catalogService.getPeriods(), { initialValue: [] });
  protected readonly courses = toSignal(this.catalogService.getCourses(), { initialValue: [] });
  protected readonly statuses = toSignal(this.catalogService.getEnrollmentStatuses(), {
    initialValue: [],
  });
  protected readonly formStatuses = computed(() =>
    this.statuses().filter((status) => status.id !== 'cancelada'),
  );
  protected readonly filteredEnrollments = computed(() => {
    const query = this.searchTerm().trim().toLocaleLowerCase('es');
    const studentId = this.studentFilter();
    const periodId = this.periodFilter();
    const status = this.statusFilter();

    return this.enrollments()
      .filter((enrollment) => {
        if (studentId !== 'todos' && enrollment.studentId !== studentId) {
          return false;
        }
        if (periodId !== 'todos' && enrollment.periodId !== periodId) {
          return false;
        }
        if (status !== 'todos' && enrollment.status !== status) {
          return false;
        }

        const searchableText = [
          enrollment.id,
          enrollment.studentId,
          this.studentName(enrollment.studentId),
          this.periodName(enrollment.periodId),
          this.courseSummary(enrollment),
          this.statusLabel(enrollment.status),
        ]
          .join(' ')
          .toLocaleLowerCase('es');

        return searchableText.includes(query);
      })
      .sort((a, b) => a.id.localeCompare(b.id, 'es', { numeric: true }));
  });

  protected readonly form = this.formBuilder.group({
    id: ['', [Validators.required, Validators.pattern(/^INS-\d{3,}$/i)]],
    studentId: ['', Validators.required],
    periodId: ['', Validators.required],
    courseIds: this.formBuilder.control<string[]>([], Validators.required),
    status: this.formBuilder.control<EnrollmentStatus>('' as EnrollmentStatus, Validators.required),
  });

  protected readonly referenceErrors = signal<string[]>([]);
  protected readonly duplicateIdError = signal('');
  protected readonly storageError = signal('');
  protected readonly successMessage = signal('');

  constructor() {
    this.applicationData.changes$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((change) => {
        this.students.set(this.studentService.getAll());
        this.enrollments.set(this.sortEnrollments(this.enrollmentService.getAll()));
        if (change === 'replace') {
          this.showForm.set(false);
          this.editingEnrollment.set(null);
          this.expandedEnrollmentId.set(null);
          this.form.reset({
            id: '',
            studentId: '',
            periodId: '',
            courseIds: [],
            status: '' as EnrollmentStatus,
          });
          this.clearMessages();
        }
      });

    afterNextRender(() => {
      this.students.set(this.studentService.getAll());
      this.enrollments.set(this.sortEnrollments(this.enrollmentService.getAll()));
      this.hasLoaded.set(true);
    });
  }

  protected openCreateForm(): void {
    this.editingEnrollment.set(null);
    this.form.reset({
      id: '',
      studentId: '',
      periodId: '',
      courseIds: [],
      status: '' as EnrollmentStatus,
    });
    this.expandedEnrollmentId.set(null);
    this.showForm.set(true);
    this.clearMessages();
  }

  protected openEditForm(enrollment: Enrollment): void {
    this.editingEnrollment.set(enrollment);
    this.form.reset({
      id: enrollment.id,
      studentId: enrollment.studentId,
      periodId: enrollment.periodId,
      courseIds: [...enrollment.courseIds],
      status: enrollment.status,
    });
    this.expandedEnrollmentId.set(null);
    this.showForm.set(true);
    this.clearMessages();
  }

  protected closeForm(): void {
    this.showForm.set(false);
    this.editingEnrollment.set(null);
    this.clearMessages();
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

    const currentEnrollments = this.enrollmentService.getAll();
    const original = this.editingEnrollment();
    const originalId = original?.id.trim().toUpperCase();
    const duplicate = currentEnrollments.some(
      (existing) =>
        existing.id.trim().toUpperCase() === enrollment.id &&
        existing.id.trim().toUpperCase() !== originalId,
    );
    if (duplicate) {
      this.duplicateIdError.set('Ese código ya corresponde a otra inscripción.');
      this.form.controls.id.setErrors({ duplicate: true });
      this.form.controls.id.markAsTouched();
      return;
    }

    const updatedEnrollments = original
      ? currentEnrollments.map((current) =>
          current.id === original.id ? enrollment : current,
        )
      : [...currentEnrollments, enrollment];
    const sortedEnrollments = this.sortEnrollments(updatedEnrollments);

    if (!this.enrollmentService.saveAll(sortedEnrollments)) {
      this.storageError.set(
        'No se pudo guardar la inscripción en este navegador. Libera espacio e inténtalo de nuevo.',
      );
      return;
    }

    this.enrollments.set(sortedEnrollments);
    this.showForm.set(false);
    this.editingEnrollment.set(null);
    this.successMessage.set(
      original ? 'Inscripción actualizada correctamente.' : 'Inscripción registrada correctamente.',
    );
    this.form.reset({
      id: '',
      studentId: '',
      periodId: '',
      courseIds: [],
      status: '' as EnrollmentStatus,
    });
  }

  protected confirmCancel(enrollment: Enrollment): void {
    this.clearMessages();
    const dialogData: ConfirmDialogData = {
      title: 'Cancelar inscripción',
      message:
        'La inscripción ' +
        enrollment.id +
        ' se marcará como cancelada y permanecerá en el historial. ¿Deseas continuar?',
      confirmLabel: 'Cancelar inscripción',
    };

    this.dialog
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
        data: dialogData,
        width: '420px',
        maxWidth: 'calc(100vw - 32px)',
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }

        const currentEnrollments = this.enrollmentService.getAll();
        const target = currentEnrollments.find((current) => current.id === enrollment.id);
        if (!target || target.status === 'cancelada') {
          return;
        }

        const updatedEnrollments = this.sortEnrollments(
          currentEnrollments.map((current) =>
            current.id === enrollment.id ? { ...current, status: 'cancelada' as const } : current,
          ),
        );

        if (!this.enrollmentService.saveAll(updatedEnrollments)) {
          this.storageError.set('No se pudo cancelar la inscripción en el almacenamiento local.');
          return;
        }

        this.enrollments.set(updatedEnrollments);
        this.successMessage.set('La inscripción ' + enrollment.id + ' quedó cancelada.');
      });
  }

  protected updateSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  protected updateStudentFilter(studentId: string): void {
    this.studentFilter.set(studentId);
  }

  protected updatePeriodFilter(periodId: string): void {
    this.periodFilter.set(periodId);
  }

  protected updateStatusFilter(status: string): void {
    this.statusFilter.set(status);
  }

  protected clearFilters(): void {
    this.searchTerm.set('');
    this.studentFilter.set('todos');
    this.periodFilter.set('todos');
    this.statusFilter.set('todos');
  }

  protected toggleDetails(enrollmentId: string): void {
    this.expandedEnrollmentId.update((current) => (current === enrollmentId ? null : enrollmentId));
  }

  protected studentName(studentId: string): string {
    const student = this.students().find((current) => current.id === studentId);
    return student ? student.firstNames + ' ' + student.lastNames : 'Estudiante no disponible';
  }

  protected periodName(periodId: string): string {
    return this.periods().find((period) => period.id === periodId)?.name ?? periodId;
  }

  protected courseSummary(enrollment: Enrollment): string {
    return enrollment.courseIds.map((courseId) => this.courseLabel(courseId)).join(', ');
  }

  protected courseLabel(courseId: string): string {
    const course = this.courses().find((current) => current.id === courseId);
    return course ? course.code + ' — ' + course.name : courseId;
  }

  protected statusLabel(status: EnrollmentStatus): string {
    return this.statuses().find((option) => option.id === status)?.label ?? status;
  }

  protected clearSearch(): void {
    this.searchTerm.set('');
  }

  private clearMessages(): void {
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

  private sortEnrollments(enrollments: Enrollment[]): Enrollment[] {
    return [...enrollments].sort((a, b) => a.id.localeCompare(b.id, 'es', { numeric: true }));
  }
}
