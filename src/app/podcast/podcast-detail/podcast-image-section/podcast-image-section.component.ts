// Copyright (c) 2025-2026 Perpetuator LLC
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

/**
 * Podcast image upload/preview section extracted from PodcastDetail so the
 * parent template stays under the cyclomatic-complexity threshold.
 */
@Component({
  selector: 'app-podcast-image-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './podcast-image-section.component.html',
  styleUrls: ['./podcast-image-section.component.scss'],
})
export class PodcastImageSectionComponent {
  @Input({ required: true }) podcastForm!: FormGroup;
  @Input() displayImageUrl: string | null = null;
  @Input() hasImage = false;
  @Input() isDragging = false;
  @Input() uploading = false;
  @Input() generating = false;
  @Input() selectedFileName: string | null = null;

  @Output() fileSelected = new EventEmitter<Event>();
  @Output() dragOver = new EventEmitter<DragEvent>();
  @Output() dragLeave = new EventEmitter<DragEvent>();
  @Output() fileDrop = new EventEmitter<DragEvent>();
  @Output() viewFullImage = new EventEmitter<void>();
  @Output() regenerate = new EventEmitter<void>();
  @Output() openHistory = new EventEmitter<void>();
  @Output() deleteImage = new EventEmitter<void>();
}
