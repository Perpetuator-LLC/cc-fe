// Copyright (c) 2026 Perpetuator LLC
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCard, MatCardContent, MatCardHeader } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { SocialsService, Broadcast } from '../socials.service';
import { MessageService } from '../../message.service';
import { BroadcastDialogComponent } from '../broadcast-dialog/broadcast-dialog.component';

@Component({
  selector: 'app-socials-list',
  standalone: true,
  imports: [
    CommonModule,
    MatCard,
    MatCardContent,
    MatCardHeader,
    MatIcon,
    MatButton,
    MatProgressBarModule,
    MatTableModule,
    MatChipsModule,
    RouterLink,
  ],
  templateUrl: './socials-list.component.html',
  styleUrl: './socials-list.component.scss',
})
export class SocialsListComponent implements OnInit, OnDestroy {
  private readonly socialsService = inject(SocialsService);
  private readonly messageService = inject(MessageService);
  private readonly dialog = inject(MatDialog);
  private subscriptions = new Subscription();

  loading = true;
  broadcasts: Broadcast[] = [];
  dataSource = new MatTableDataSource<Broadcast>([]);
  displayedColumns = ['platform', 'text', 'status', 'date', 'engagement'];

  ngOnInit(): void {
    this.loadBroadcasts();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadBroadcasts(): void {
    this.loading = true;
    this.subscriptions.add(
      this.socialsService.getBroadcasts().subscribe({
        next: (broadcasts) => {
          this.broadcasts = broadcasts;
          this.dataSource.data = broadcasts;
          this.loading = false;
        },
        error: (err) => {
          this.messageService.error('Failed to load broadcasts: ' + err.message);
          this.loading = false;
        },
      }),
    );
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PUBLISHED':
        return 'status-success';
      case 'DRAFT':
        return 'status-draft';
      case 'SCHEDULED':
        return 'status-scheduled';
      case 'QUEUED':
      case 'PUBLISHING':
        return 'status-warning';
      case 'FAILED':
        return 'status-error';
      default:
        return '';
    }
  }

  getPlatformIcon(platform: string | null): string {
    switch (platform?.toUpperCase()) {
      case 'TWITTER':
        return 'share'; // X/Twitter
      case 'LINKEDIN':
        return 'work';
      case 'FACEBOOK':
        return 'facebook';
      case 'INSTAGRAM':
        return 'photo_camera';
      case 'THREADS':
        return 'forum';
      case 'BLUESKY':
        return 'cloud';
      default:
        return 'share';
    }
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  }

  truncateText(text: string, maxLength: number = 100): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  createBroadcast(): void {
    const dialogRef = this.dialog.open(BroadcastDialogComponent, {
      width: '600px',
      maxHeight: '90vh',
      data: {},
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadBroadcasts();
      }
    });
  }
}



