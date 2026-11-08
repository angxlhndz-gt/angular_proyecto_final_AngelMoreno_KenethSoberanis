import { inject, Injectable } from '@angular/core';

import { Student } from '../models/student.model';
import { BrowserStorageService } from './browser-storage.service';

@Injectable({ providedIn: 'root' })
export class StudentService {
  private readonly storage = inject(BrowserStorageService);
  private readonly storageKey = 'prograweb.students';

  getAll(): Student[] {
    return this.storage.read<Student[]>(this.storageKey, () => []);
  }

  saveAll(students: Student[]): boolean {
    return this.storage.write(this.storageKey, students);
  }
}
