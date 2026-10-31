export type EnrollmentStatus =
  | 'borrador'
  | 'registrada'
  | 'en-revision'
  | 'aprobada'
  | 'rechazada'
  | 'cancelada';

export interface Enrollment {
  /** Identificador único de la inscripción, por ejemplo: INS-001. */
  id: string;
  studentId: string;
  periodId: string;
  courseIds: string[];
  status: EnrollmentStatus;
}
