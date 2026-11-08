import { Routes } from '@angular/router';
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
    component: PagePlaceholder,
    title: 'Inscripciones | Gestión académica',
    data: {
      title: 'Inscripciones',
      description: 'En este módulo podrás crear y consultar las inscripciones por período académico.',
      icon: 'assignment',
    },
  },
  {
    path: '**',
    redirectTo: '',
  },
];
