import { inject, Injectable } from '@angular/core';
import { Subject } from 'rxjs';

import { ApplicationData } from '../models/application-data.model';
import { Enrollment } from '../models/enrollment.model';
import { Student } from '../models/student.model';
import { BrowserStorageService } from './browser-storage.service';

@Injectable({ providedIn: 'root' })
export class ApplicationDataService {
  private readonly storage = inject(BrowserStorageService);
  private readonly storageKey = 'prograweb.application-data.v1';
  private readonly legacyStudentsKey = 'prograweb.students';
  private readonly legacyEnrollmentsKey = 'prograweb.enrollments';
  private readonly changesSubject = new Subject<'save' | 'replace'>();

  readonly changes$ = this.changesSubject.asObservable();

  getAll(): ApplicationData {
    const stored = this.storage.read<unknown>(this.storageKey, () => null);
    if (this.isApplicationData(stored)) {
      return stored;
    }

    const legacyData: ApplicationData = {
      students: this.storage.read<Student[]>(this.legacyStudentsKey, () => []),
      enrollments: this.storage.read<Enrollment[]>(this.legacyEnrollmentsKey, () => []),
    };
    this.storage.write(this.storageKey, legacyData);
    return legacyData;
  }

  saveStudents(students: Student[]): boolean {
    return this.persist({ ...this.getAll(), students });
  }

  saveEnrollments(enrollments: Enrollment[]): boolean {
    return this.persist({ ...this.getAll(), enrollments });
  }

  replaceAll(data: ApplicationData): boolean {
    return this.persist({ students: data.students, enrollments: data.enrollments }, 'replace');
  }

  private persist(data: ApplicationData, change: 'save' | 'replace' = 'save'): boolean {
    const saved = this.storage.write(this.storageKey, data);
    if (saved) {
      this.changesSubject.next(change);
    }
    return saved;
  }

  private isApplicationData(value: unknown): value is ApplicationData {
    return (
      typeof value === 'object' &&
      value !== null &&
      'students' in value &&
      Array.isArray(value.students) &&
      'enrollments' in value &&
      Array.isArray(value.enrollments)
    );
  }
}
