import { inject, Injectable } from '@angular/core';
import { forkJoin, firstValueFrom } from 'rxjs';

import {
  ApplicationBackup,
  BackupValidationResult,
} from '../models/application-backup.model';
import { CatalogService } from './catalog.service';

interface BackupCatalogs {
  genders: Set<string>;
  contactTypes: Set<string>;
  courses: Set<string>;
  periods: Set<string>;
  enrollmentStatuses: Set<string>;
}

@Injectable({ providedIn: 'root' })
export class BackupValidationService {
  private readonly catalogService = inject(CatalogService);

  async validateJsonContent(content: string): Promise<BackupValidationResult> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(content) as unknown;
    } catch {
      return { valid: false, errors: ['El archivo no contiene JSON válido.'] };
    }

    const structuralErrors = this.validateStructure(parsed);
    if (structuralErrors.length > 0) {
      return { valid: false, errors: structuralErrors };
    }

    try {
      const catalogResponses = await firstValueFrom(
        forkJoin({
          genders: this.catalogService.getGenders(),
          contactTypes: this.catalogService.getContactTypes(),
          courses: this.catalogService.getCourses(),
          periods: this.catalogService.getPeriods(),
          enrollmentStatuses: this.catalogService.getEnrollmentStatuses(),
        }),
      );
      const catalogs: BackupCatalogs = {
        genders: new Set(catalogResponses.genders.map((item) => item.id)),
        contactTypes: new Set(catalogResponses.contactTypes.map((item) => item.id)),
        courses: new Set(catalogResponses.courses.map((item) => item.id)),
        periods: new Set(catalogResponses.periods.map((item) => item.id)),
        enrollmentStatuses: new Set(catalogResponses.enrollmentStatuses.map((item) => item.id)),
      };
      const backup = parsed as ApplicationBackup;
      const referenceErrors = this.validateCatalogReferences(backup, catalogs);

      return referenceErrors.length > 0
        ? { valid: false, errors: referenceErrors }
        : { valid: true, data: backup };
    } catch {
      return {
        valid: false,
        errors: ['No se pudieron cargar los catálogos necesarios para validar el respaldo.'],
      };
    }
  }

  private validateStructure(value: unknown): string[] {
    const errors: string[] = [];
    if (!this.isRecord(value)) {
      return ['El contenido debe ser un objeto JSON de respaldo.'];
    }

    this.checkExactKeys(
      value,
      ['format', 'version', 'exportedAt', 'students', 'enrollments'],
      'El respaldo',
      errors,
    );
    if (value['format'] !== 'prograweb-backup') {
      this.addError(errors, 'El archivo no corresponde a un respaldo de Prograweb.');
    }
    if (value['version'] !== 1) {
      this.addError(errors, 'La versión del respaldo no es compatible. Se esperaba la versión 1.');
    }

    const exportedAt = value['exportedAt'];
    if (
      typeof exportedAt !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(exportedAt) ||
      Number.isNaN(Date.parse(exportedAt)) ||
      new Date(exportedAt).toISOString() !== exportedAt
    ) {
      this.addError(errors, 'La fecha de exportación está ausente o no es válida.');
    }

    const studentIds = new Set<string>();
    const enrollmentIds = new Set<string>();
    const students = value['students'];
    if (!Array.isArray(students)) {
      this.addError(errors, 'La colección de estudiantes debe ser una lista.');
    } else {
      students.forEach((student: unknown, index: number) =>
        this.validateStudentShape(student, index, studentIds, errors),
      );
    }

    const enrollments = value['enrollments'];
    if (!Array.isArray(enrollments)) {
      this.addError(errors, 'La colección de inscripciones debe ser una lista.');
    } else {
      enrollments.forEach((enrollment: unknown, index: number) =>
        this.validateEnrollmentShape(enrollment, index, enrollmentIds, studentIds, errors),
      );
    }

    return errors;
  }

  private validateStudentShape(
    value: unknown,
    index: number,
    studentIds: Set<string>,
    errors: string[],
  ): void {
    const label = 'Estudiante #' + (index + 1);
    if (!this.isRecord(value)) {
      this.addError(errors, label + ' debe ser un objeto.');
      return;
    }

    this.checkExactKeys(
      value,
      ['id', 'firstNames', 'lastNames', 'birthDate', 'gender', 'email', 'address', 'contacts'],
      label,
      errors,
    );

    const id = this.requiredText(value, 'id', label + ': código', errors, 1, 32);
    if (id && !/^EST-\d{3,}$/i.test(id)) {
      this.addError(errors, label + ': el código debe tener el formato EST-001.');
    } else if (id) {
      const normalizedId = id.trim().toUpperCase();
      if (studentIds.has(normalizedId)) {
        this.addError(errors, label + ': el código estudiantil está duplicado.');
      }
      studentIds.add(normalizedId);
    }

    this.requiredText(value, 'firstNames', label + ': nombres', errors, 2, 80);
    this.requiredText(value, 'lastNames', label + ': apellidos', errors, 2, 80);
    this.requiredText(value, 'address', label + ': dirección', errors, 5, 180);

    const birthDate = this.requiredText(
      value,
      'birthDate',
      label + ': fecha de nacimiento',
      errors,
      10,
      10,
    );
    if (birthDate && !this.isCalendarDate(birthDate)) {
      this.addError(errors, label + ': la fecha de nacimiento no es válida.');
    }

    const email = this.requiredText(value, 'email', label + ': correo', errors, 3, 120);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.addError(errors, label + ': el correo electrónico no tiene un formato válido.');
    }

    const gender = value['gender'];
    if (typeof gender !== 'string' || !gender.trim()) {
      this.addError(errors, label + ': el género debe ser un texto no vacío.');
    }

    if (!Array.isArray(value['contacts'])) {
      this.addError(errors, label + ': los contactos deben ser una lista.');
    } else {
      value['contacts'].forEach((contact: unknown, contactIndex: number) => {
        const contactLabel = label + ', contacto #' + (contactIndex + 1);
        if (!this.isRecord(contact)) {
          this.addError(errors, contactLabel + ' debe ser un objeto.');
          return;
        }

        this.checkExactKeys(contact, ['number', 'type', 'active'], contactLabel, errors);
        const number = this.requiredText(contact, 'number', contactLabel + ': número', errors, 7, 20);
        if (number && !/^[+0-9() -]{7,20}$/.test(number)) {
          this.addError(errors, contactLabel + ': el número contiene caracteres no válidos.');
        }
        const contactType = contact['type'];
        if (typeof contactType !== 'string' || !contactType.trim()) {
          this.addError(errors, contactLabel + ': el tipo debe ser un texto no vacío.');
        }
        if (typeof contact['active'] !== 'boolean') {
          this.addError(errors, contactLabel + ': el indicador activo debe ser verdadero o falso.');
        }
      });
    }
  }

  private validateEnrollmentShape(
    value: unknown,
    index: number,
    enrollmentIds: Set<string>,
    studentIds: Set<string>,
    errors: string[],
  ): void {
    const label = 'Inscripción #' + (index + 1);
    if (!this.isRecord(value)) {
      this.addError(errors, label + ' debe ser un objeto.');
      return;
    }

    this.checkExactKeys(
      value,
      ['id', 'studentId', 'periodId', 'courseIds', 'status'],
      label,
      errors,
    );

    const id = this.requiredText(value, 'id', label + ': código', errors, 1, 32);
    if (id && !/^INS-\d{3,}$/i.test(id)) {
      this.addError(errors, label + ': el código debe tener el formato INS-001.');
    } else if (id) {
      const normalizedId = id.trim().toUpperCase();
      if (enrollmentIds.has(normalizedId)) {
        this.addError(errors, label + ': el código de inscripción está duplicado.');
      }
      enrollmentIds.add(normalizedId);
    }

    const studentId = this.requiredText(value, 'studentId', label + ': estudiante', errors, 1, 32);
    if (studentId && !studentIds.has(studentId.trim().toUpperCase())) {
      this.addError(errors, label + ': no existe el estudiante ' + studentId + ' en el respaldo.');
    }

    this.requiredText(value, 'periodId', label + ': período', errors, 1, 80);
    const status = value['status'];
    if (typeof status !== 'string' || !status.trim()) {
      this.addError(errors, label + ': el estado debe ser un texto no vacío.');
    }

    const courseIds = value['courseIds'];
    if (!Array.isArray(courseIds) || courseIds.length === 0) {
      this.addError(errors, label + ': debe incluir al menos un curso.');
    } else {
      const uniqueCourseIds = new Set<string>();
      courseIds.forEach((courseId: unknown) => {
        if (typeof courseId !== 'string' || !courseId.trim()) {
          this.addError(errors, label + ': cada código de curso debe ser un texto no vacío.');
          return;
        }
        if (uniqueCourseIds.has(courseId)) {
          this.addError(errors, label + ': hay un curso repetido en la inscripción.');
        }
        uniqueCourseIds.add(courseId);
      });
    }
  }

  private validateCatalogReferences(backup: ApplicationBackup, catalogs: BackupCatalogs): string[] {
    const errors: string[] = [];
    const studentIds = new Set(backup.students.map((student) => student.id.trim().toUpperCase()));

    backup.students.forEach((student, index) => {
      if (!catalogs.genders.has(student.gender)) {
        this.addError(errors, 'Estudiante #' + (index + 1) + ': el género no existe en el catálogo.');
      }
      student.contacts.forEach((contact, contactIndex) => {
        if (!catalogs.contactTypes.has(contact.type)) {
          this.addError(
            errors,
            'Estudiante #' + (index + 1) + ', contacto #' + (contactIndex + 1) +
              ': el tipo no existe en el catálogo.',
          );
        }
      });
    });

    backup.enrollments.forEach((enrollment) => {
      if (!studentIds.has(enrollment.studentId.trim().toUpperCase())) {
        this.addError(errors, 'Inscripción ' + enrollment.id + ': el estudiante asociado no existe.');
      }
      if (!catalogs.periods.has(enrollment.periodId)) {
        this.addError(errors, 'Inscripción ' + enrollment.id + ': el período no existe en el catálogo.');
      }
      if (!catalogs.enrollmentStatuses.has(enrollment.status)) {
        this.addError(errors, 'Inscripción ' + enrollment.id + ': el estado no existe en el catálogo.');
      }
      enrollment.courseIds.forEach((courseId) => {
        if (!catalogs.courses.has(courseId)) {
          this.addError(
            errors,
            'Inscripción ' + enrollment.id + ': el curso ' + courseId + ' no existe en el catálogo.',
          );
        }
      });
    });

    return errors;
  }

  private requiredText(
    record: Record<string, unknown>,
    key: string,
    label: string,
    errors: string[],
    minLength: number,
    maxLength: number,
  ): string | null {
    const value = record[key];
    if (typeof value !== 'string' || value.trim().length < minLength || value.length > maxLength) {
      this.addError(errors, label + ' debe ser un texto válido.');
      return null;
    }
    return value;
  }

  private checkExactKeys(
    record: Record<string, unknown>,
    expectedKeys: string[],
    label: string,
    errors: string[],
  ): void {
    const hasEveryKey = expectedKeys.every((key) =>
      Object.prototype.hasOwnProperty.call(record, key),
    );
    const hasOnlyExpectedKeys = Object.keys(record).every((key) => expectedKeys.includes(key));
    if (!hasEveryKey || !hasOnlyExpectedKeys) {
      this.addError(errors, label + ': la estructura de campos no coincide con la versión del respaldo.');
    }
  }

  private isCalendarDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private addError(errors: string[], message: string): void {
    if (errors.length < 50) {
      errors.push(message);
    } else if (errors.length === 50) {
      errors.push('Se omitieron más errores para mantener el resumen legible.');
    }
  }
}
