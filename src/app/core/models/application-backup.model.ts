import { Enrollment } from './enrollment.model';
import { Student } from './student.model';

export interface ApplicationBackup {
  format: 'prograweb-backup';
  version: 1;
  exportedAt: string;
  students: Student[];
  enrollments: Enrollment[];
}
