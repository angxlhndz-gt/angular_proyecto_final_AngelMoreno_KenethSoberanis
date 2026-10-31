import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { AcademicPeriod } from '../models/academic-period.model';
import { CatalogOption } from '../models/catalog-option.model';
import { Course } from '../models/course.model';
import { EnrollmentStatus } from '../models/enrollment.model';
import { ContactType, StudentGender } from '../models/student.model';

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly http = inject(HttpClient);

  getCourses(): Observable<Course[]> {
    return this.http.get<Course[]>('/data/courses.json');
  }

  getPeriods(): Observable<AcademicPeriod[]> {
    return this.http.get<AcademicPeriod[]>('/data/periods.json');
  }

  getGenders(): Observable<CatalogOption<StudentGender>[]> {
    return this.http.get<CatalogOption<StudentGender>[]>('/data/genders.json');
  }

  getContactTypes(): Observable<CatalogOption<ContactType>[]> {
    return this.http.get<CatalogOption<ContactType>[]>('/data/contact-types.json');
  }

  getSchedules(): Observable<CatalogOption[]> {
    return this.http.get<CatalogOption[]>('/data/schedules.json');
  }

  getModalities(): Observable<CatalogOption[]> {
    return this.http.get<CatalogOption[]>('/data/modalities.json');
  }

  getEnrollmentStatuses(): Observable<CatalogOption<EnrollmentStatus>[]> {
    return this.http.get<CatalogOption<EnrollmentStatus>[]>('/data/enrollment-statuses.json');
  }
}
