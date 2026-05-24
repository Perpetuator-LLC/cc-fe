// Copyright (c) 2026 Perpetuator LLC
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { SocialsService, Broadcast } from '../socials.service';
import { MessageService } from '../../message.service';
import { BroadcastDialogComponent } from '../broadcast-dialog/broadcast-dialog.component';

/** Pre-computed display fields attached to each broadcast row. */
interface BroadcastDisplay extends Broadcast {
  platformIcon: string;
  truncatedText: string;
  statusClass: string;
  formattedPublishedAt: string;
  formattedScheduledAt: string;
  formattedCreatedAt: string;
  topHashtags: string[];
}

@Component({
  selector: 'app-posts-list',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    MatTableModule,
    MatChipsModule,
    RouterLink,
  ],
  templateUrl: './posts-list.component.html',
  styleUrl: './posts-list.component.scss',
})
export class PostsListComponent implements OnInit, OnDestroy {
  private readonly socialsService = inject(SocialsService);
  private readonly messageService = inject(MessageService);
  private readonly dialog = inject(MatDialog);
  private subscriptions = new Subscription();

  loading = true;
  /** Broadcasts enriched with pre-computed display fields for the template. */
  broadcasts: BroadcastDisplay[] = [];
  dataSource = new MatTableDataSource<BroadcastDisplay>([]);
  displayedColumns = ['platform', 'text', 'status', 'date', 'engagement'];

  private enrich(b: Broadcast): BroadcastDisplay {
    return {
      ...b,
      platformIcon: this.getPlatformIcon(b.platform),
      truncatedText: this.truncateText(b.text),
      statusClass: this.getStatusClass(b.status),
      formattedPublishedAt: this.formatDate(b.publishedAt),
      formattedScheduledAt: this.formatDate(b.scheduledAt),
      formattedCreatedAt: this.formatDate(b.createdAt),
      topHashtags: (b.hashtags ?? []).slice(0, 3),
    };
  }

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
          this.broadcasts = broadcasts.map((b) => this.enrich(b));
          this.dataSource.data = this.broadcasts;
          this.loading = false;
        },
        error: (err) => {
          this.messageService.error('Failed to load posts: ' + err.message);
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
        return 'share';
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
      case 'MASTODON':
        return 'public';
      case 'TELEGRAM':
        return 'send';
      default:
        return 'share';
    }
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  }

  truncateText(text: string, maxLength = 100): string {
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
