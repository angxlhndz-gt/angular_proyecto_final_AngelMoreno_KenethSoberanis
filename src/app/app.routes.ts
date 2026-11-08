import { Routes } from '@angular/router';
import { EnrollmentForm } from './features/enrollments/enrollment-form/enrollment-form';
import { Home } from './features/home/home';
import { StudentsPage } from './features/students/students-page/students-page';
import { PagePlaceholder } from './shared/page-placeholder/page-placeholder';

export const routes: Routes = [
  {
    path: '',
    component: Home,
    title: 'Inicio | Gestión académica',
  },
  {
    path: 'estudiantes',
    component: StudentsPage,
    title: 'Estudiantes | Gestión académica',
  },
  {
    path: 'inscripciones',
    component: EnrollmentForm,
    title: 'Inscripciones | Gestión académica',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
