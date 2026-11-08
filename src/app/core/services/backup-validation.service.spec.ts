import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { of } from 'rxjs';

import { CatalogService } from './catalog.service';
import { BackupValidationService } from './backup-validation.service';

describe('BackupValidationService', () => {
  let service: BackupValidationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        BackupValidationService,
        {
          provide: CatalogService,
          useValue: {
            getGenders: () => of([{ id: 'masculino', label: 'Masculino' }]),
            getContactTypes: () => of([{ id: 'movil', label: 'Móvil' }]),
            getCourses: () =>
              of([{ id: 'WEB101', code: 'WEB101', name: 'Programación Web', credits: 4, areaId: 'sistemas' }]),
            getPeriods: () => of([{ id: '2026-2', name: '2026-2' }]),
            getEnrollmentStatuses: () => of([{ id: 'registrada', label: 'Registrada' }]),
          },
        },
      ],
    });
    service = TestBed.inject(BackupValidationService);
  });

  it('normalizes student IDs and enrollment references before returning valid data', async () => {
    const result = await service.validateJsonContent(
      JSON.stringify({
        format: 'prograweb-backup',
        version: 1,
        exportedAt: '2026-11-08T00:00:00.000Z',
        students: [
          {
            id: 'est-001',
            firstNames: 'Ana',
            lastNames: 'López',
            birthDate: '2000-01-01',
            gender: 'masculino',
            email: 'ana@example.com',
            address: 'Zona 1, Guatemala',
            contacts: [],
          },
        ],
        enrollments: [
          {
            id: 'ins-001',
            studentId: ' EST-001 ',
            periodId: '2026-2',
            courseIds: ['WEB101'],
            status: 'registrada',
          },
        ],
      }),
    );

    expect(result.valid).toBeTrue();
    if (result.valid) {
      expect(result.data.students[0].id).toBe('EST-001');
      expect(result.data.enrollments[0].id).toBe('INS-001');
      expect(result.data.enrollments[0].studentId).toBe('EST-001');
    }
  });

  it('rejects a backup contact without 7 to 15 actual digits', async () => {
    const result = await service.validateJsonContent(
      JSON.stringify({
        format: 'prograweb-backup',
        version: 1,
        exportedAt: '2026-11-08T00:00:00.000Z',
        students: [
          {
            id: 'EST-001',
            firstNames: 'Ana',
            lastNames: 'López',
            birthDate: '2000-01-01',
            gender: 'masculino',
            email: 'ana@example.com',
            address: 'Zona 1, Guatemala',
            contacts: [{ number: '-------', type: 'movil', active: true }],
          },
        ],
        enrollments: [],
      }),
    );

    expect(result.valid).toBeFalse();
    if (!result.valid) {
      expect(result.errors.join(' ')).toContain('dígitos');
    }
  });
});
