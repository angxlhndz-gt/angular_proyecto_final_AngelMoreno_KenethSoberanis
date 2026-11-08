import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { ContactType, Student, StudentGender } from '../../../core/models/student.model';
import { CatalogService } from '../../../core/services/catalog.service';
import { EnrollmentService } from '../../../core/services/enrollment.service';
import { StudentService } from '../../../core/services/student.service';
import { ConfirmDialog, ConfirmDialogData } from '../../../shared/confirm-dialog/confirm-dialog';
import { StudentForm } from '../student-form/student-form';

@Component({
  selector: 'app-students-page',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSnackBarModule,
    StudentForm,
  ],
  templateUrl: './students-page.html',
  styleUrl: './students-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentsPage {
  private readonly studentService = inject(StudentService);
  private readonly enrollmentService = inject(EnrollmentService);
  private readonly catalogService = inject(CatalogService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly students = signal(this.studentService.getAll());
  protected readonly hasLoaded = signal(false);
  protected readonly searchTerm = signal('');
  protected readonly showForm = signal(false);
  protected readonly editingStudent = signal<Student | null>(null);
  protected readonly expandedStudentId = signal<string | null>(null);
  protected readonly genders = toSignal(this.catalogService.getGenders(), { initialValue: [] });
  protected readonly contactTypes = toSignal(this.catalogService.getContactTypes(), {
    initialValue: [],
  });
  protected readonly filteredStudents = computed(() => {
    const query = this.searchTerm().trim().toLocaleLowerCase('es');

    return this.students()
      .filter((student) => {
        const searchableText = [
          student.id,
          student.firstNames,
          student.lastNames,
          student.email,
          student.address,
        ]
          .join(' ')
          .toLocaleLowerCase('es');

        return searchableText.includes(query);
      })
      .sort((a, b) => {
        const lastNameOrder = a.lastNames.localeCompare(b.lastNames, 'es');
        return lastNameOrder || a.firstNames.localeCompare(b.firstNames, 'es');
      });
  });

  constructor() {
    afterNextRender(() => {
      this.students.set(this.studentService.getAll());
      this.hasLoaded.set(true);
    });
  }

  protected openCreateForm(): void {
    this.editingStudent.set(null);
    this.expandedStudentId.set(null);
    this.showForm.set(true);
  }

  protected openEditForm(student: Student): void {
    this.editingStudent.set(student);
    this.expandedStudentId.set(null);
    this.showForm.set(true);
  }

  protected closeForm(): void {
    this.showForm.set(false);
    this.editingStudent.set(null);
  }

  protected saveStudent(student: Student): void {
    const currentStudents = this.students();
    const originalStudent = this.editingStudent();
    const normalizedStudent = this.normalizeStudent(student);
    const duplicate = currentStudents.find(
      (current) => current.id.trim().toUpperCase() === normalizedStudent.id,
    );
    const isSameStudent =
      duplicate?.id.trim().toUpperCase() === originalStudent?.id.trim().toUpperCase();

    if (duplicate && !isSameStudent) {
      this.snackBar.open(
        'El código ' + normalizedStudent.id + ' ya está asignado a otro estudiante.',
        'Cerrar',
        { duration: 5000 },
      );
      return;
    }

    if (
      originalStudent &&
      originalStudent.id !== normalizedStudent.id &&
      this.hasEnrollments(originalStudent.id)
    ) {
      this.snackBar.open(
        'No se puede cambiar el código porque el estudiante tiene inscripciones asociadas.',
        'Cerrar',
        { duration: 6000 },
      );
      return;
    }

    const updatedStudents = originalStudent
      ? currentStudents.map((current) =>
          current.id === originalStudent.id ? normalizedStudent : current,
        )
      : [...currentStudents, normalizedStudent];

    const sortedStudents = [...updatedStudents].sort((a, b) => {
      const lastNameOrder = a.lastNames.localeCompare(b.lastNames, 'es');
      return lastNameOrder || a.firstNames.localeCompare(b.firstNames, 'es');
    });

    if (!this.studentService.saveAll(sortedStudents)) {
      this.snackBar.open(
        'No se pudieron guardar los datos en este navegador. Libera espacio e inténtalo de nuevo.',
        'Cerrar',
        { duration: 6000 },
      );
      return;
    }

    this.students.set(sortedStudents);
    this.closeForm();
    this.snackBar.open(
      originalStudent ? 'Estudiante actualizado.' : 'Estudiante registrado.',
      'Cerrar',
      { duration: 3500 },
    );
  }

  protected updateSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  protected clearSearch(): void {
    this.searchTerm.set('');
  }

  protected toggleDetails(studentId: string): void {
    this.expandedStudentId.update((current) => (current === studentId ? null : studentId));
  }

  protected confirmDelete(student: Student): void {
    if (this.hasEnrollments(student.id)) {
      this.snackBar.open(
        'No se puede eliminar este estudiante porque tiene inscripciones asociadas.',
        'Cerrar',
        { duration: 6000 },
      );
      return;
    }

    const dialogData: ConfirmDialogData = {
      title: 'Eliminar estudiante',
      message:
        '¿Deseas eliminar a ' +
        student.firstNames +
        ' ' +
        student.lastNames +
        ' (' +
        student.id +
        ')? Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar estudiante',
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

        const updatedStudents = this.students().filter((current) => current.id !== student.id);
        if (!this.studentService.saveAll(updatedStudents)) {
          this.snackBar.open('No se pudo eliminar el registro del almacenamiento local.', 'Cerrar', {
            duration: 5000,
          });
          return;
        }

        this.students.set(updatedStudents);
        this.expandedStudentId.set(null);
        this.snackBar.open('Estudiante eliminado.', 'Cerrar', { duration: 3500 });
      });
  }

  protected activeContactCount(student: Student): number {
    return student.contacts.filter((contact) => contact.active).length;
  }

  protected genderLabel(gender: StudentGender): string {
    return this.genders().find((option) => option.id === gender)?.label ?? gender;
  }

  protected contactTypeLabel(type: ContactType): string {
    return this.contactTypes().find((option) => option.id === type)?.label ?? type;
  }

  protected formatDate(value: string): string {
    const [year, month, day] = value.split('-');
    return year && month && day ? day + '/' + month + '/' + year : value;
  }

  private hasEnrollments(studentId: string): boolean {
    const normalizedId = studentId.trim().toUpperCase();
    return this.enrollmentService
      .getAll()
      .some((enrollment) => enrollment.studentId.trim().toUpperCase() === normalizedId);
  }

  private normalizeStudent(student: Student): Student {
    return {
      ...student,
      id: student.id.trim().toUpperCase(),
      firstNames: student.firstNames.trim(),
      lastNames: student.lastNames.trim(),
      email: student.email.trim(),
      address: student.address.trim(),
      contacts: student.contacts.map((contact) => ({
        ...contact,
        number: contact.number.trim(),
      })),
    };
  }
}
