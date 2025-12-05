// Copyright (c) 2025 Perpetuator LLC
import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { MatIcon } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PodcastsResult } from '../../podcasts.service';
import { RecentlyUsedPodcastsService } from '../../recently-used-podcasts.service';

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
  selectedPodcast: string | null = null;

  constructor(
    public dialogRef: MatDialogRef<CreateEpisodeDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CreateEpisodeDialogData,
    private recentlyUsedPodcastsService: RecentlyUsedPodcastsService,
  ) {}

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
