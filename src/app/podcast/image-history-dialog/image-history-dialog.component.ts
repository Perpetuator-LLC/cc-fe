// Copyright (c) 2026 Perpetuator LLC

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PodcastImageResult, PodcastsService } from '../podcasts.service';
import { MessageService } from '../../message.service';

export interface ImageHistoryDialogData {
  podcastUuid: string;
}

export interface ImageHistoryDialogResult {
  reverted: boolean;
  imageUuid?: string;
}

@Component({
  selector: 'app-image-history-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './image-history-dialog.component.html',
  styleUrl: './image-history-dialog.component.scss',
})
export class ImageHistoryDialogComponent implements OnInit {
  private dialogRef = inject<MatDialogRef<ImageHistoryDialogComponent, ImageHistoryDialogResult>>(MatDialogRef);
  data = inject<ImageHistoryDialogData>(MAT_DIALOG_DATA);
  private podcastsService = inject(PodcastsService);
  private messageService = inject(MessageService);

  loading = true;
  reverting = false;
  imageHistory: PodcastImageResult[] = [];

  ngOnInit(): void {
    this.loadImageHistory();
  }

  loadImageHistory(): void {
    this.loading = true;
    this.podcastsService.getPodcastImageHistory(this.data.podcastUuid).subscribe({
      next: (history) => {
        this.imageHistory = history;
        this.loading = false;
      },
      error: (error) => {
        this.messageService.error(`Failed to load image history: ${error.message}`);
        this.loading = false;
      },
    });
  }

  revertToImage(image: PodcastImageResult): void {
    this.reverting = true;
    this.podcastsService.revertPodcastImage(this.data.podcastUuid, image.uuid).subscribe({
      next: () => {
        this.messageService.success('Image reverted successfully');
        this.dialogRef.close({ reverted: true, imageUuid: image.uuid });
      },
      error: (error) => {
        this.messageService.error(`Failed to revert image: ${error.message}`);
        this.reverting = false;
      },
    });
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  getSourceIcon(source: string): string {
    switch (source) {
      case 'AI_GENERATED':
        return 'auto_awesome';
      case 'MANUAL_UPLOAD':
        return 'upload';
      case 'REVERTED':
        return 'history';
      default:
        return 'image';
    }
  }

  onClose(): void {
    this.dialogRef.close({ reverted: false });
  }
}
