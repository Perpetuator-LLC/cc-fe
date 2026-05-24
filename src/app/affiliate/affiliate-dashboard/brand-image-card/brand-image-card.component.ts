// Copyright (c) 2025-2026 Perpetuator LLC
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

/**
 * Brand image upload card extracted from AffiliateDashboard to keep the parent
 * template under the cyclomatic-complexity threshold.
 */
@Component({
  selector: 'app-brand-image-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule],
  templateUrl: './brand-image-card.component.html',
  styleUrls: ['./brand-image-card.component.scss'],
})
export class BrandImageCardComponent {
  @Input() brandImageUrl: string | null = null;
  @Input() imagePreview: string | null = null;
  @Input() isDragging = false;
  @Input() uploadingImage = false;

  @Output() fileSelected = new EventEmitter<Event>();
  @Output() dragOver = new EventEmitter<DragEvent>();
  @Output() dragLeave = new EventEmitter<DragEvent>();
  @Output() fileDrop = new EventEmitter<DragEvent>();
  @Output() deleteImage = new EventEmitter<void>();
  @Output() imageError = new EventEmitter<void>();

  get uploadButtonLabel(): string {
    return this.brandImageUrl ? 'Change Image' : 'Upload Image';
  }

  get showCurrentImage(): boolean {
    return !!this.brandImageUrl && !this.imagePreview;
  }
}
