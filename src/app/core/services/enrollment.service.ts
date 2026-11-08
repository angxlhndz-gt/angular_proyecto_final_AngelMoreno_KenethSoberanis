import { inject, Injectable } from '@angular/core';

import { Enrollment } from '../models/enrollment.model';
import { BrowserStorageService } from './browser-storage.service';

@Injectable({ providedIn: 'root' })
export class EnrollmentService {
  private readonly storage = inject(BrowserStorageService);
  private readonly storageKey = 'prograweb.enrollments';

  getAll(): Enrollment[] {
    return this.storage.read<Enrollment[]>(this.storageKey, () => []);
  }

  saveAll(enrollments: Enrollment[]): boolean {
    return this.storage.write(this.storageKey, enrollments);
  }
}
