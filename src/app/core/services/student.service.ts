import { inject, Injectable } from '@angular/core';

import { Student } from '../models/student.model';
import { ApplicationDataService } from './application-data.service';

@Injectable({ providedIn: 'root' })
export class StudentService {
  private readonly applicationData = inject(ApplicationDataService);

  getAll(): Student[] {
    return this.applicationData.getAll().students;
  }

  saveAll(students: Student[]): boolean {
    return this.applicationData.saveStudents(students);
  }
}
