// Copyright (c) 2025 Perpetuator LLC
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { ShareService, ShareConfig } from '../share.service';
import { MessageService } from '../message.service';

@Component({
  selector: 'app-share-buttons',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule, MatMenuModule, MatDividerModule],
  templateUrl: './share-buttons.component.html',
  styleUrl: './share-buttons.component.scss',
})
export class ShareButtonsComponent {
  @Input() shareUrl!: string;
  @Input() title!: string;
  @Input() description?: string;
  @Input() compact = false;

  protected canNativeShare = false;

  constructor(
    private shareService: ShareService,
    private messageService: MessageService,
  ) {
    this.canNativeShare = this.shareService.canNativeShare();
  }

  private getShareConfig(): ShareConfig {
    return {
      url: this.shareUrl,
      title: this.title,
      description: this.description,
    };
  }

  async shareNative(): Promise<void> {
    const success = await this.shareService.nativeShare(this.getShareConfig());
    if (!success) {
      this.messageService.info('Share cancelled');
    }
  }

  shareToTwitter(): void {
    this.shareService.shareToTwitter(this.getShareConfig());
  }

  shareToFacebook(): void {
    this.shareService.shareToFacebook(this.getShareConfig());
  }

  shareToLinkedIn(): void {
    this.shareService.shareToLinkedIn(this.getShareConfig());
  }

  shareToReddit(): void {
    this.shareService.shareToReddit(this.getShareConfig());
  }

  shareToWhatsApp(): void {
    this.shareService.shareToWhatsApp(this.getShareConfig());
  }

  shareToTelegram(): void {
    this.shareService.shareToTelegram(this.getShareConfig());
  }

  shareToSignal(): void {
    this.shareService.shareToSignal(this.getShareConfig());
  }

  shareToEmail(): void {
    this.shareService.shareToEmail(this.getShareConfig());
  }

  copyLink(): void {
    this.shareService.copyToClipboard(this.shareUrl);
    this.messageService.success('Link copied to clipboard!');
  }
}
