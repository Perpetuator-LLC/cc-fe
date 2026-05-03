// Copyright (c) 2026 Perpetuator LLC
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { Subscription } from 'rxjs';
import { SocialsService, SocialAccount, Broadcast } from '../socials.service';
import { MessageService } from '../../message.service';

export interface BroadcastDialogData {
  broadcast?: Broadcast;
  socialAccountUuid?: string;
  sourceType?: string;
  sourceUuid?: string;
}

interface PlatformLimit {
  name: string;
  maxLength: number;
}

const PLATFORM_LIMITS: Record<string, PlatformLimit> = {
  TWITTER: { name: 'Twitter/X', maxLength: 280 },
  X: { name: 'Twitter/X', maxLength: 280 },
  LINKEDIN: { name: 'LinkedIn', maxLength: 3000 },
  FACEBOOK: { name: 'Facebook', maxLength: 63206 },
  INSTAGRAM: { name: 'Instagram', maxLength: 2200 },
  TIKTOK: { name: 'TikTok', maxLength: 2200 },
  BLUESKY: { name: 'Bluesky', maxLength: 300 },
  MASTODON: { name: 'Mastodon', maxLength: 500 },
  THREADS: { name: 'Threads', maxLength: 500 },
  TELEGRAM: { name: 'Telegram', maxLength: 4096 },
};

@Component({
  selector: 'app-broadcast-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatDatepickerModule,
  ],
  templateUrl: './broadcast-dialog.component.html',
  styleUrl: './broadcast-dialog.component.scss',
})
export class BroadcastDialogComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<BroadcastDialogComponent>);
  private readonly data = inject<BroadcastDialogData>(MAT_DIALOG_DATA);
  private readonly socialsService = inject(SocialsService);
  private readonly messageService = inject(MessageService);
  private subscriptions = new Subscription();

  form!: FormGroup;
  socialAccounts: SocialAccount[] = [];
  loading = false;
  loadingAccounts = true;
  isEdit = false;
  selectedPlatformLimit: PlatformLimit | null = null;

  ngOnInit(): void {
    this.isEdit = !!this.data?.broadcast;
    this.initForm();
    this.loadSocialAccounts();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private initForm(): void {
    const broadcast = this.data?.broadcast;
    this.form = this.fb.group({
      socialAccountUuid: [this.data?.socialAccountUuid || broadcast?.socialAccount?.id || '', Validators.required],
      text: [broadcast?.text || '', Validators.required],
      linkUrl: [broadcast?.linkUrl || ''],
      hashtags: [broadcast?.hashtags || []],
      scheduledAt: [broadcast?.scheduledAt ? new Date(broadcast.scheduledAt) : null],
    });

    // Watch for account changes to update character limit
    this.form.get('socialAccountUuid')?.valueChanges.subscribe((uuid) => {
      this.updatePlatformLimit(uuid);
    });
  }

  private loadSocialAccounts(): void {
    this.loadingAccounts = true;
    this.subscriptions.add(
      this.socialsService.getSocialAccounts(undefined, undefined, true).subscribe({
        next: (accounts) => {
          this.socialAccounts = accounts;
          this.loadingAccounts = false;
          // Set initial platform limit if account is selected
          const selectedUuid = this.form.get('socialAccountUuid')?.value;
          if (selectedUuid) {
            this.updatePlatformLimit(selectedUuid);
          }
        },
        error: (err) => {
          this.messageService.error('Failed to load social accounts: ' + err.message);
          this.loadingAccounts = false;
        },
      }),
    );
  }

  private updatePlatformLimit(accountUuid: string): void {
    const account = this.socialAccounts.find((a) => a.id === accountUuid);
    if (account) {
      const platform = account.platform?.toUpperCase() || '';
      this.selectedPlatformLimit = PLATFORM_LIMITS[platform] || null;
    } else {
      this.selectedPlatformLimit = null;
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const formValue = this.form.value;

    if (this.isEdit && this.data?.broadcast) {
      // Update existing broadcast
      this.subscriptions.add(
        this.socialsService
          .updateBroadcast(this.data.broadcast.id, {
            text: formValue.text,
            linkUrl: formValue.linkUrl || undefined,
            hashtags: formValue.hashtags,
            scheduledAt: formValue.scheduledAt?.toISOString(),
          })
          .subscribe({
            next: (result) => {
              this.loading = false;
              if (result.success) {
                this.messageService.success('Post updated successfully');
                this.dialogRef.close(result.broadcast);
              } else {
                this.messageService.error(result.message || 'Failed to update post');
              }
            },
            error: (err) => {
              this.loading = false;
              this.messageService.error('Failed to update post: ' + err.message);
            },
          }),
      );
    } else {
      // Create new broadcast
      this.subscriptions.add(
        this.socialsService
          .createBroadcast(formValue.socialAccountUuid, formValue.text, {
            linkUrl: formValue.linkUrl || undefined,
            hashtags: formValue.hashtags,
            scheduledAt: formValue.scheduledAt?.toISOString(),
            sourceType: this.data?.sourceType,
            sourceUuid: this.data?.sourceUuid,
          })
          .subscribe({
            next: (result) => {
              this.loading = false;
              if (result.success) {
                this.messageService.success('Post created successfully');
                this.dialogRef.close(result.broadcast);
              } else {
                this.messageService.error(result.message || 'Failed to create post');
              }
            },
            error: (err) => {
              this.loading = false;
              this.messageService.error('Failed to create post: ' + err.message);
            },
          }),
      );
    }
  }

  addHashtag(inputRef: HTMLInputElement): void {
    const tag = inputRef.value.trim().replace(/^#/, '');
    if (tag && !this.form.value.hashtags.includes(tag)) {
      const hashtags = [...this.form.value.hashtags, tag];
      this.form.patchValue({ hashtags });
    }
    inputRef.value = '';
  }

  removeHashtag(tag: string): void {
    const hashtags = this.form.value.hashtags.filter((t: string) => t !== tag);
    this.form.patchValue({ hashtags });
  }

  getCharacterCount(): number {
    return this.form.get('text')?.value?.length || 0;
  }

  isOverLimit(): boolean {
    if (!this.selectedPlatformLimit) return false;
    return this.getCharacterCount() > this.selectedPlatformLimit.maxLength;
  }

  getPlatformIcon(platform: string | undefined): string {
    switch (platform?.toUpperCase()) {
      case 'TWITTER':
      case 'X':
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
        return 'groups';
      case 'TIKTOK':
        return 'music_note';
      case 'TELEGRAM':
        return 'send';
      default:
        return 'share';
    }
  }
}
