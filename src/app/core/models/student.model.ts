export type StudentGender =
  | 'masculino'
  | 'femenino'
  | 'otro'
  | 'prefiero-no-indicar';

export type ContactType = 'movil' | 'casa' | 'trabajo' | 'otro';

export interface StudentContact {
  number: string;
  type: ContactType;
  active: boolean;
}

export interface Student {
  /** Identificador estudiantil único, por ejemplo: EST-001. */
  id: string;
  firstNames: string;
  lastNames: string;
  birthDate: string;
  gender: StudentGender;
  email: string;
  address: string;
  contacts: StudentContact[];
}
