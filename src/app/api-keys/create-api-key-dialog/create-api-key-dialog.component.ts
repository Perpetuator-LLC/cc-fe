// Copyright (c) 2025 Perpetuator LLC
import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';
import { ApiKeyService, ApiKey } from '../api-key.service';
import { MessageService } from '../../message.service';

@Component({
  selector: 'app-create-api-key-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './create-api-key-dialog.component.html',
  styleUrl: './create-api-key-dialog.component.scss',
})
export class CreateApiKeyDialogComponent implements OnDestroy {
  form: FormGroup;
  loading = false;
  createdKey: string | null = null;
  createdApiKey: ApiKey | null = null;
  copied = false;
  private subscriptions = new Subscription();

  constructor(
    private fb: FormBuilder,
    private apiKeyService: ApiKeyService,
    private messageService: MessageService,
    private dialogRef: MatDialogRef<CreateApiKeyDialogComponent>,
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  onCreate(): void {
    if (this.form.invalid) {
      return;
    }

    this.loading = true;
    const input = {
      name: this.form.value.name,
    };

    this.subscriptions.add(
      this.apiKeyService.createApiKey(input).subscribe({
        next: (result) => {
          this.createdKey = result.key;
          this.createdApiKey = result.apiKey;
          this.loading = false;
          this.messageService.success('API key created successfully!');
        },
        error: (error) => {
          this.loading = false;
          this.messageService.error(`Failed to create API key: ${error.message}`);
        },
      }),
    );
  }

  copyKey(): void {
    if (this.createdKey) {
      navigator.clipboard.writeText(this.createdKey).then(() => {
        this.copied = true;
        this.messageService.success('API key copied to clipboard!');
        setTimeout(() => {
          this.copied = false;
        }, 2000);
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onClose(): void {
    this.dialogRef.close(this.createdApiKey);
  }
}
