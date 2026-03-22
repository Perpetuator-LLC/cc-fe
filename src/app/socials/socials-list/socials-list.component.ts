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
import { Subscription } from 'rxjs';
import { SocialsService, SocialAccount } from '../socials.service';
import { MessageService } from '../../message.service';
import { ConnectSocialDialogComponent } from '../connect-social-dialog/connect-social-dialog.component';

@Component({
  selector: 'app-socials-list',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    MatTableModule,
    MatChipsModule,
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
  accounts: SocialAccount[] = [];
  dataSource = new MatTableDataSource<SocialAccount>([]);
  displayedColumns = ['platform', 'account', 'status', 'posts', 'lastUsed'];

  ngOnInit(): void {
    this.loadAccounts();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadAccounts(): void {
    this.loading = true;
    this.subscriptions.add(
      this.socialsService.getSocialAccounts().subscribe({
        next: (accounts) => {
          this.accounts = accounts;
          this.dataSource.data = accounts;
          this.loading = false;
        },
        error: (err) => {
          this.messageService.error('Failed to load social accounts: ' + err.message);
          this.loading = false;
        },
      }),
    );
  }

  getStatusClass(status: string, isTokenExpired: boolean | null): string {
    if (isTokenExpired) return 'status-error';
    switch (status) {
      case 'ACTIVE':
        return 'status-success';
      case 'EXPIRED':
      case 'REVOKED':
        return 'status-error';
      case 'ERROR':
        return 'status-warning';
      default:
        return '';
    }
  }

  getPlatformIcon(platform: string): string {
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
      default:
        return 'share';
    }
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString();
  }

  connectAccount(): void {
    const dialogRef = this.dialog.open(ConnectSocialDialogComponent, {
      width: '500px',
      maxHeight: '90vh',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.socialAccount) {
        this.loadAccounts();
      }
    });
  }
}
