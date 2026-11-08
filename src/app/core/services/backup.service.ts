import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';

import { ApplicationBackup } from '../models/application-backup.model';
import { EnrollmentService } from './enrollment.service';
import { StudentService } from './student.service';

@Injectable({ providedIn: 'root' })
export class BackupService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly studentService = inject(StudentService);
  private readonly enrollmentService = inject(EnrollmentService);

  exportBackup(): boolean {
    if (!this.isBrowser) {
      return false;
    }

    const exportedAt = new Date().toISOString();
    const backup: ApplicationBackup = {
      format: 'prograweb-backup',
      version: 1,
      exportedAt,
      students: this.studentService.getAll(),
      enrollments: this.enrollmentService.getAll(),
    };

    let objectUrl = '';
    try {
      const file = new Blob([JSON.stringify(backup, null, 2)], {
        type: 'application/json;charset=utf-8',
      });
      objectUrl = URL.createObjectURL(file);

      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = 'prograweb-respaldo-' + exportedAt.slice(0, 10) + '.json';
      link.hidden = true;
      document.body.append(link);
      link.click();
      link.remove();

      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      return true;
    } catch {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      return false;
    }
  }
}
