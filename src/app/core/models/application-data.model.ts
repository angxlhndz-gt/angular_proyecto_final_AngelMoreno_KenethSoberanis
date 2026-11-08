import { Enrollment } from './enrollment.model';
import { Student } from './student.model';

export interface ApplicationData {
  students: Student[];
  enrollments: Enrollment[];
}
