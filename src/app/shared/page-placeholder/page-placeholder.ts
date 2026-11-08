import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';

interface PlaceholderPage {
  title: string;
  description: string;
  icon: string;
}

@Component({
  selector: 'app-page-placeholder',
  imports: [MatIconModule],
  templateUrl: './page-placeholder.html',
  styleUrl: './page-placeholder.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PagePlaceholder {
  private readonly route = inject(ActivatedRoute);

  protected readonly page = toSignal(
    this.route.data.pipe(
      map((data): PlaceholderPage => ({
        title: data['title'] as string,
        description: data['description'] as string,
        icon: data['icon'] as string,
      })),
    ),
    { initialValue: { title: '', description: '', icon: 'construction' } },
  );
}
