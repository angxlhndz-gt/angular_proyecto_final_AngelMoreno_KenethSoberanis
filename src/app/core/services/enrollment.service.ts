import { inject, Injectable } from '@angular/core';

import { Enrollment } from '../models/enrollment.model';
import { ApplicationDataService } from './application-data.service';

@Injectable({ providedIn: 'root' })
export class EnrollmentService {
  private readonly applicationData = inject(ApplicationDataService);

  getAll(): Enrollment[] {
    return this.applicationData.getAll().enrollments;
  }

  saveAll(enrollments: Enrollment[]): boolean {
    return this.applicationData.saveEnrollments(enrollments);
  }
}
