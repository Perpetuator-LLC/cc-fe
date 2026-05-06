// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, OnInit, inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { MatIcon } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PodcastsResult } from '../../podcast/podcasts.service';
import { RecentlyUsedPodcastsService } from '../../podcast/recently-used-podcasts.service';

export interface CreateEpisodeDialogData {
  podcasts: PodcastsResult[];
}

export interface CreateEpisodeDialogResult {
  podcastUuid: string;
  episodeType: 'blank' | 'news' | 'research';
}

@Component({
  selector: 'app-create-episode-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatFormField,
    MatLabel,
    MatSelect,
    MatOption,
    MatIcon,
    FormsModule,
  ],
  templateUrl: './create-episode-dialog.component.html',
  styleUrl: './create-episode-dialog.component.scss',
})
export class CreateEpisodeDialogComponent implements OnInit {
  dialogRef = inject<MatDialogRef<CreateEpisodeDialogComponent>>(MatDialogRef);
  data = inject<CreateEpisodeDialogData>(MAT_DIALOG_DATA);
  private recentlyUsedPodcastsService = inject(RecentlyUsedPodcastsService);

  selectedPodcast: string | null = null;

  ngOnInit(): void {
    // Sort podcasts by recently used
    this.data.podcasts = this.recentlyUsedPodcastsService.sortByRecentlyUsed(this.data.podcasts);

    // Auto-select if there's only one podcast, or use most recently used
    this.selectedPodcast = this.recentlyUsedPodcastsService.getDefaultSelection(this.data.podcasts);
  }

  createEpisode(episodeType: 'blank' | 'news' | 'research'): void {
    if (!this.selectedPodcast) {
      return;
    }

    // Record the podcast selection in history
    this.recentlyUsedPodcastsService.recordSelection(this.selectedPodcast);

    const result: CreateEpisodeDialogResult = {
      podcastUuid: this.selectedPodcast,
      episodeType,
    };

    this.dialogRef.close(result);
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }
}
