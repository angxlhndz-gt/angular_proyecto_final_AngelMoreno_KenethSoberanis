import { BreakpointObserver } from '@angular/cdk/layout';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { BackupService } from './core/services/backup.service';
import { BackupValidationService } from './core/services/backup-validation.service';
import { ApplicationDataService } from './core/services/application-data.service';
import { ConfirmDialog, ConfirmDialogData } from './shared/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-root',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatListModule,
    MatSnackBarModule,
    MatSidenavModule,
    MatToolbarModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly destroyRef = inject(DestroyRef);
  private readonly backupService = inject(BackupService);
  private readonly backupValidationService = inject(BackupValidationService);
  private readonly applicationData = inject(ApplicationDataService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly isHandset = signal(false);
  protected readonly menuOpen = signal(false);
  protected readonly importing = signal(false);
  protected readonly drawerOpen = computed(() => !this.isHandset() || this.menuOpen());

  constructor() {
    afterNextRender(() => {
      this.breakpointObserver
        .observe('(max-width: 760px)')
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(({ matches }) => {
          this.isHandset.set(matches);
          if (!matches) {
            this.menuOpen.set(false);
          }
        });
    });
  }

  protected toggleMenu(): void {
    this.menuOpen.update((isOpen) => !isOpen);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected exportData(): void {
    const exported = this.backupService.exportBackup();
    this.snackBar.open(
      exported
        ? 'Respaldo JSON descargado con estudiantes e inscripciones.'
        : 'No se pudo generar el archivo de respaldo en este entorno.',
      'Cerrar',
      { duration: 4500 },
    );
  }

  protected async importData(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    input.value = '';
    this.importing.set(true);

    try {
      const result = await this.backupValidationService.validateJsonContent(await file.text());
      if (!result.valid) {
        const visibleErrors = result.errors.slice(0, 2).join(' ');
        const remainingCount = result.errors.length - 2;
        const extraMessage =
          remainingCount > 0
            ? ' Hay ' + remainingCount + (remainingCount === 1 ? ' error más.' : ' errores más.')
            : '';
        this.snackBar.open('No se importó el archivo. ' + visibleErrors + extraMessage, 'Cerrar', {
          duration: 9000,
        });
        return;
      }

      const dialogData: ConfirmDialogData = {
        title: 'Reemplazar los datos actuales',
        message:
          'El respaldo es válido y contiene ' +
          result.data.students.length +
          ' estudiantes y ' +
          result.data.enrollments.length +
          ' inscripciones. Reemplazará todos los registros guardados en este navegador. ' +
          'Esta acción no se puede deshacer.',
        confirmLabel: 'Reemplazar datos',
      };
      const confirmed = await firstValueFrom(
        this.dialog
          .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
            data: dialogData,
            width: '460px',
            maxWidth: 'calc(100vw - 32px)',
          })
          .afterClosed(),
      );
      if (!confirmed) {
        return;
      }

      const saved = this.applicationData.replaceAll({
        students: result.data.students,
        enrollments: result.data.enrollments,
      });
      this.snackBar.open(
        saved
          ? 'Importación completada: ' +
              result.data.students.length +
              ' estudiantes y ' +
              result.data.enrollments.length +
              ' inscripciones.'
          : 'No se pudieron guardar los datos importados en este navegador.',
        'Cerrar',
        { duration: 6000 },
      );
    } catch {
      this.snackBar.open('No se pudo leer el archivo seleccionado.', 'Cerrar', { duration: 6000 });
    } finally {
      this.importing.set(false);
    }
  }
}
