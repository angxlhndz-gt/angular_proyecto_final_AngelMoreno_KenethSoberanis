import { Routes } from '@angular/router';
import { Home } from './features/home/home';
import { PagePlaceholder } from './shared/page-placeholder/page-placeholder';

export const routes: Routes = [
  {
    path: '',
    component: Home,
    title: 'Inicio | Gestión académica',
  },
  {
    path: 'estudiantes',
    component: PagePlaceholder,
    title: 'Estudiantes | Gestión académica',
    data: {
      title: 'Estudiantes',
      description: 'En este módulo podrás consultar y administrar los datos de los estudiantes.',
      icon: 'groups',
    },
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
