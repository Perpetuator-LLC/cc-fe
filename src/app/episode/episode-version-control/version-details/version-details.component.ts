// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, Input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { SafeHtml } from '@angular/platform-browser';

/** Display fields pre-computed by the parent. */
export interface VersionDetailsDisplay {
  changeTypeIcon: string;
  changeTypeLabel: string;
  isFullyValidated: boolean;
  validationTooltip: string;
  validationIcon: string;
  validationBadgeClass: string;
  validationLabel: string;
  wordCount: number;
  charCount: number;
}

/** Minimal version shape this component needs. */
export interface VersionDetailsVersion {
  versionNumber: number;
  content: string;
  audioUrl?: string;
  validationNotes?: string;
  createdAt: string;
  createdBy?: { id: string; username: string };
  display: VersionDetailsDisplay;
}

@Component({
  selector: 'app-version-details',
  standalone: true,
  imports: [DatePipe, MatIcon, MatTooltip, MatFormField, MatLabel, MatInput],
  templateUrl: './version-details.component.html',
  styleUrls: ['./version-details.component.scss'],
})
export class VersionDetailsComponent {
  @Input() version: VersionDetailsVersion | null = null;
  @Input() notesHtml: SafeHtml | null = null;

  get hasAudio(): boolean {
    return !!(this.version?.audioUrl && this.version.audioUrl.trim());
  }
}
