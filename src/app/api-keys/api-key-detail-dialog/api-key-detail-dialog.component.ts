// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { Subscription } from 'rxjs';
import { ApiKeyService, ApiKey, ApiKeyAnalytics, ApiKeyUsage } from '../api-key.service';
import { MessageService } from '../../message.service';

export interface ApiKeyDetailDialogData {
  apiKey: ApiKey;
}

@Component({
  selector: 'app-api-key-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatDividerModule,
  ],
  templateUrl: './api-key-detail-dialog.component.html',
  styleUrl: './api-key-detail-dialog.component.scss',
})
export class ApiKeyDetailDialogComponent implements OnInit, OnDestroy {
  data = inject<ApiKeyDetailDialogData>(MAT_DIALOG_DATA);
  private apiKeyService = inject(ApiKeyService);
  private messageService = inject(MessageService);
  private dialogRef = inject<MatDialogRef<ApiKeyDetailDialogComponent>>(MatDialogRef);

  loading = false;
  analytics: ApiKeyAnalytics | null = null;
  recentUsage: ApiKeyUsage[] = [];
  private subscriptions = new Subscription();

  ngOnInit(): void {
    this.loadAnalytics();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadAnalytics(): void {
    this.loading = true;

    // Load analytics
    this.subscriptions.add(
      this.apiKeyService.getApiKeyAnalytics(this.data.apiKey.uuid).subscribe({
        next: (analytics) => {
          this.analytics = analytics;
          this.loading = false;
        },
        error: (error) => {
          this.loading = false;
          this.messageService.error(`Failed to load analytics: ${error.message}`);
        },
      }),
    );

    // Load recent usage
    this.subscriptions.add(
      this.apiKeyService.getApiKeyUsage(this.data.apiKey.uuid, 20).subscribe({
        next: (usage) => {
          this.recentUsage = usage;
        },
        error: (error) => {
          this.messageService.error(`Failed to load usage history: ${error.message}`);
        },
      }),
    );
  }

  onToggleActive(): void {
    const newStatus = !this.data.apiKey.isActive;
    this.subscriptions.add(
      this.apiKeyService
        .updateApiKey({
          uuid: this.data.apiKey.uuid,
          isActive: newStatus,
        })
        .subscribe({
          next: (updatedKey) => {
            this.data.apiKey.isActive = updatedKey.isActive;
            this.messageService.success(`API key ${newStatus ? 'activated' : 'deactivated'} successfully`);
          },
          error: (error) => {
            this.messageService.error(`Failed to update API key: ${error.message}`);
          },
        }),
    );
  }

  onDelete(): void {
    if (confirm(`Are you sure you want to delete the API key "${this.data.apiKey.name}"? This cannot be undone.`)) {
      this.subscriptions.add(
        this.apiKeyService.deleteApiKey(this.data.apiKey.uuid).subscribe({
          next: () => {
            this.messageService.success('API key deleted successfully');
            this.dialogRef.close({ deleted: true });
          },
          error: (error) => {
            this.messageService.error(`Failed to delete API key: ${error.message}`);
          },
        }),
      );
    }
  }

  onClose(): void {
    this.dialogRef.close();
  }
}
