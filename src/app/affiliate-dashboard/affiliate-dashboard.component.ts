// Copyright (c) 2025 Perpetuator LLC
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';
import {
  AffiliateService,
  AffiliateProfile,
  AffiliateStats,
  AffiliateCredit,
  AffiliateConversion,
  AffiliateTermsConsent,
} from '../affiliate.service';
import { MessageService } from '../message.service';
import { AffiliateTermsDialogComponent } from '../affiliate-terms-dialog/affiliate-terms-dialog.component';
import { ConvertCreditsDialogComponent } from '../convert-credits-dialog/convert-credits-dialog.component';
// eslint-disable-next-line max-len
import { AffiliateCodeChangeDialogComponent } from '../affiliate-code-change-dialog/affiliate-code-change-dialog.component';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import { Clipboard } from '@angular/cdk/clipboard';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-affiliate-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatTabsModule,
    MatTooltipModule,
  ],
  templateUrl: './affiliate-dashboard.component.html',
  styleUrls: ['./affiliate-dashboard.component.scss'],
})
export class AffiliateDashboardComponent implements OnInit, OnDestroy {
  private subscriptions = new Subscription();

  loading = true;
  profile: AffiliateProfile | null = null;
  stats: AffiliateStats | null = null;
  credits: AffiliateCredit[] = [];
  conversions: AffiliateConversion[] = [];
  termsConsents: AffiliateTermsConsent[] = [];

  creditsDisplayedColumns: string[] = ['date', 'from', 'type', 'amount'];
  conversionsDisplayedColumns: string[] = ['date', 'type', 'amount', 'status'];

  isDragging = false;
  uploadingImage = false;
  imagePreview: string | null = null;
  readonly MAX_FILE_SIZE = 1024 * 1024;
  readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  readonly ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

  constructor(
    private affiliateService: AffiliateService,
    private messageService: MessageService,
    private dialog: MatDialog,
    private clipboard: Clipboard,
  ) {}

  ngOnInit(): void {
    this.checkTermsAcceptance();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  checkTermsAcceptance(): void {
    this.subscriptions.add(
      this.affiliateService.getAffiliateTermsConsents().subscribe({
        next: (consents) => {
          this.termsConsents = consents;
          const hasAcceptedTerms = consents.some((c) => c.accepted && c.version === '1.0');

          if (!hasAcceptedTerms) {
            this.showTermsDialog();
          } else {
            this.loadDashboardData();
          }
        },
        error: (err) => {
          console.error('Error checking terms:', err);
          this.showTermsDialog();
        },
      }),
    );
  }

  showTermsDialog(): void {
    const dialogRef = this.dialog.open(AffiliateTermsDialogComponent, {
      width: '600px',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((accepted) => {
      if (accepted) {
        this.loadDashboardData();
      } else {
        this.messageService.error('You must accept the affiliate terms to access the dashboard');
      }
    });
  }

  loadDashboardData(): void {
    this.loading = true;

    this.subscriptions.add(
      this.affiliateService.getAffiliateProfile().subscribe({
        next: (profile) => {
          this.profile = profile;
          this.loadStats();
        },
        error: (err) => {
          this.messageService.error(`Failed to load profile: ${err.message}`);
          this.loading = false;
        },
      }),
    );
  }

  loadStats(): void {
    this.subscriptions.add(
      this.affiliateService.getAffiliateStats().subscribe({
        next: (stats) => {
          this.stats = stats;
          this.loadCredits();
        },
        error: (err) => {
          this.messageService.error(`Failed to load stats: ${err.message}`);
          this.loading = false;
        },
      }),
    );
  }

  loadCredits(): void {
    this.subscriptions.add(
      this.affiliateService.getAffiliateCredits().subscribe({
        next: (credits) => {
          this.credits = credits;
          this.loadConversions();
        },
        error: (err) => {
          this.messageService.error(`Failed to load credits: ${err.message}`);
          this.loading = false;
        },
      }),
    );
  }

  loadConversions(): void {
    this.subscriptions.add(
      this.affiliateService.getAffiliateConversions().subscribe({
        next: (conversions) => {
          this.conversions = conversions;
          this.loading = false;
        },
        error: (err) => {
          this.messageService.error(`Failed to load conversions: ${err.message}`);
          this.loading = false;
        },
      }),
    );
  }

  getAffiliateLink(): string {
    if (!this.profile?.code) return '';
    return `${environment.SITE_URL}/a/${this.profile.code}`;
  }

  copyLink(): void {
    const link = this.getAffiliateLink();
    this.clipboard.copy(link);
    this.messageService.success('Affiliate link copied to clipboard!');
  }

  shareOnTwitter(): void {
    const link = this.getAffiliateLink();
    const text = encodeURIComponent('Join me on Capital Copilot!');
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(link)}`, '_blank');
  }

  shareOnLinkedIn(): void {
    const link = this.getAffiliateLink();
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`, '_blank');
  }

  shareViaEmail(): void {
    const link = this.getAffiliateLink();
    const subject = encodeURIComponent('Join me on Capital Copilot');
    const body = encodeURIComponent(`I'd like to invite you to join Capital Copilot using my affiliate link: ${link}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  openConvertDialog(type: 'credits' | 'cash'): void {
    const dialogRef = this.dialog.open(ConvertCreditsDialogComponent, {
      width: '500px',
      data: {
        type,
        availableBalance: this.getAvailableBalance(),
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadDashboardData();
      }
    });
  }

  getAvailableBalance(): number {
    if (!this.stats) return 0;
    const totalCompleted = this.conversions
      .filter((c) => c.status === 'completed')
      .reduce((sum, c) => sum + c.affiliateCreditAmount, 0);
    return this.stats.totalAffiliateCredits - totalCompleted;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  getTierDescription(tier: number): string {
    return tier === 1 ? 'Tier 1 (10%)' : 'Tier 2 (5%)';
  }

  getConversionTypeDisplay(type: string): string {
    return type === 'to_credits' ? 'Credits' : 'Cash';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.handleFile(file);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      this.handleFile(file);
    }
  }

  handleFile(file: File): void {
    const validation = this.validateFile(file);
    if (!validation.valid) {
      this.messageService.error(validation.error || 'Invalid file');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreview = reader.result as string;
      this.uploadBrandImage(file);
    };
    reader.readAsDataURL(file);
  }

  validateFile(file: File): { valid: boolean; error?: string } {
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File size exceeds 1MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
      };
    }

    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: `Invalid file type. Allowed: JPEG, PNG, GIF, WEBP`,
      };
    }

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !this.ALLOWED_EXTENSIONS.includes(extension)) {
      return {
        valid: false,
        error: `Invalid file extension. Allowed: ${this.ALLOWED_EXTENSIONS.join(', ')}`,
      };
    }

    return { valid: true };
  }

  uploadBrandImage(file: File): void {
    this.uploadingImage = true;
    this.messageService.clearMessages();

    this.subscriptions.add(
      this.affiliateService.updateAffiliateBrandImage(file).subscribe({
        next: (response) => {
          this.uploadingImage = false;
          this.messageService.success('Brand image updated successfully!');
          if (response.affiliateProfile) {
            this.profile = response.affiliateProfile;
          }
          this.imagePreview = null;
        },
        error: (err) => {
          this.uploadingImage = false;
          this.imagePreview = null;
          this.messageService.error(`Failed to upload image: ${err.message}`);
        },
      }),
    );
  }

  deleteBrandImage(): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Brand Image',
        message: 'Are you sure you want to delete your brand image?',
        confirmText: 'Delete',
        cancelText: 'Cancel',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.uploadingImage = true;
        this.subscriptions.add(
          this.affiliateService.deleteAffiliateBrandImage().subscribe({
            next: (response) => {
              this.uploadingImage = false;
              this.messageService.success('Brand image deleted successfully!');
              if (response.affiliateProfile) {
                this.profile = response.affiliateProfile;
              }
            },
            error: (err) => {
              this.uploadingImage = false;
              this.messageService.error(`Failed to delete image: ${err.message}`);
            },
          }),
        );
      }
    });
  }

  openCodeChangeDialog(): void {
    const dialogRef = this.dialog.open(AffiliateCodeChangeDialogComponent, {
      width: '600px',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadDashboardData();
      }
    });
  }

  onImageError(): void {
    console.error('Failed to load brand image:', this.profile?.brandImageUrl);
    this.messageService.warning('Failed to load brand image. The image may have been deleted or the URL is invalid.');
  }
}
