// Copyright (c) 2025-2026 Perpetuator LLC
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-episode-research-urls',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIcon],
  templateUrl: './episode-research-urls.component.html',
  styleUrl: './episode-research-urls.component.scss',
})
export class EpisodeResearchUrlsComponent {
  @Input() urls: string[] = [];

  get countLabel(): string {
    return `${this.urls.length} URLs`;
  }

  get hasUrls(): boolean {
    return this.urls.length > 0;
  }
}
