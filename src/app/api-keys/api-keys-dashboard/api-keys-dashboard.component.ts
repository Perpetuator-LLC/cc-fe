// Copyright (c) 2025 Perpetuator LLC
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { ApiKeyService, ApiKey } from '../api-key.service';
import { MessageService } from '../../message.service';
import { CreateApiKeyDialogComponent } from '../create-api-key-dialog/create-api-key-dialog.component';
import {
  ApiKeyDetailDialogComponent,
  ApiKeyDetailDialogData,
} from '../api-key-detail-dialog/api-key-detail-dialog.component';

@Component({
  selector: 'app-api-keys-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatDividerModule,
    MatMenuModule,
  ],
  templateUrl: './api-keys-dashboard.component.html',
  styleUrl: './api-keys-dashboard.component.scss',
})
export class ApiKeysDashboardComponent implements OnInit, OnDestroy {
  apiKeys: ApiKey[] = [];
  loading = false;
  private subscriptions = new Subscription();

  constructor(
    private apiKeyService: ApiKeyService,
    private messageService: MessageService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.loadApiKeys();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadApiKeys(): void {
    this.loading = true;
    this.subscriptions.add(
      this.apiKeyService.getApiKeys().subscribe({
        next: (keys) => {
          this.apiKeys = keys;
          this.loading = false;
        },
        error: (error) => {
          this.loading = false;
          this.messageService.error(`Failed to load API keys: ${error.message}`);
        },
      }),
    );
  }

  onCreateKey(): void {
    const dialogRef = this.dialog.open(CreateApiKeyDialogComponent, {
      width: '600px',
      disableClose: false,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Refresh the list to show the new key
        this.loadApiKeys();
      }
    });
  }

  onViewDetails(apiKey: ApiKey): void {
    const dialogRef = this.dialog.open(ApiKeyDetailDialogComponent, {
      width: '800px',
      maxHeight: '90vh',
      data: { apiKey } as ApiKeyDetailDialogData,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.deleted) {
        // Remove from local list if deleted
        this.apiKeys = this.apiKeys.filter((k) => k.uuid !== apiKey.uuid);
      } else {
        // Refresh to get updated data
        this.loadApiKeys();
      }
    });
  }

  onToggleActive(apiKey: ApiKey): void {
    const newStatus = !apiKey.isActive;
    this.subscriptions.add(
      this.apiKeyService
        .updateApiKey({
          uuid: apiKey.uuid,
          isActive: newStatus,
        })
        .subscribe({
          next: (updatedKey) => {
            // Update in local list
            const index = this.apiKeys.findIndex((k) => k.uuid === apiKey.uuid);
            if (index !== -1) {
              this.apiKeys[index] = updatedKey;
            }
            this.messageService.success(`API key ${newStatus ? 'activated' : 'deactivated'} successfully`);
          },
          error: (error) => {
            this.messageService.error(`Failed to update API key: ${error.message}`);
          },
        }),
    );
  }

  onDelete(apiKey: ApiKey): void {
    if (confirm(`Are you sure you want to delete the API key "${apiKey.name}"? This cannot be undone.`)) {
      this.subscriptions.add(
        this.apiKeyService.deleteApiKey(apiKey.uuid).subscribe({
          next: () => {
            // Remove from local list
            this.apiKeys = this.apiKeys.filter((k) => k.uuid !== apiKey.uuid);
            this.messageService.success('API key deleted successfully');
          },
          error: (error) => {
            this.messageService.error(`Failed to delete API key: ${error.message}`);
          },
        }),
      );
    }
  }
}
