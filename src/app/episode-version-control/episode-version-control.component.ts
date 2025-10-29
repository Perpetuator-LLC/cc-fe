// Copyright (c) 2025 Perpetuator LLC
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInput } from '@angular/material/input';
import { SafeHtml } from '@angular/platform-browser';
import { EpisodeVersion } from '../episode.service';

@Component({
  selector: 'app-episode-version-control',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    MatExpansionModule,
    MatIcon,
    MatTooltip,
    MatButton,
    MatFormField,
    MatLabel,
    MatSelectModule,
    MatInput,
  ],
  templateUrl: './episode-version-control.component.html',
  styleUrls: ['./episode-version-control.component.scss'],
})
export class EpisodeVersionControlComponent {
  @Input() currentVersionNumber: number | null = null;
  @Input() isCurrentVersionFullyValidated = false;
  @Input() currentVersionValidationTooltip = '';
  @Input() historyVersions: EpisodeVersion[] = [];
  @Input() currentVersionChangeType: string | null = null;
  @Input() currentVersionCreator: string | null = null;
  @Input() currentVersionCreatedAt: string | null = null;
  @Input() currentVersionValidationNotes: SafeHtml | null = null;
  @Input() selectedVersionNumber: number | null = null;
  @Input() selectedVersion: EpisodeVersion | null = null;

  @Output() validateEpisode = new EventEmitter<void>();
  @Output() regenerateEpisode = new EventEmitter<void>();
  @Output() versionSelect = new EventEmitter<number>();
  @Output() copyVersionContent = new EventEmitter<void>();
  @Output() restoreVersion = new EventEmitter<void>();

  getChangeTypeIcon(changeType: string | null | undefined): string {
    if (!changeType) return 'help_outline';
    switch (changeType.toLowerCase()) {
      case 'manual':
        return 'edit';
      case 'regeneration':
        return 'refresh';
      case 'validation':
        return 'verified';
      case 'restoration':
        return 'restore';
      default:
        return 'help_outline';
    }
  }

  getChangeTypeLabel(changeType: string | null | undefined): string {
    if (!changeType) return 'Unknown';
    return changeType.charAt(0).toUpperCase() + changeType.slice(1).toLowerCase();
  }

  isVersionFullyValidated(version: EpisodeVersion): boolean {
    return version.validatedCompliance && version.validatedFacts && version.validatedLength;
  }

  getValidationTooltip(version: EpisodeVersion): string {
    const parts: string[] = [];
    parts.push(`Facts: ${version.validatedFacts ? '✓' : '✗'}`);
    parts.push(`Length: ${version.validatedLength ? '✓' : '✗'}`);
    parts.push(`Compliance: ${version.validatedCompliance ? '✓' : '✗'}`);

    const status = this.isVersionFullyValidated(version) ? 'Validated' : 'Not Validated';
    return `${status}\n - ${parts.join('\n - ')}`;
  }

  getVersionWordCount(version: EpisodeVersion): number {
    return version.content ? version.content.split(/\s+/).filter(Boolean).length : 0;
  }

  getVersionCharCount(version: EpisodeVersion): number {
    return version.content ? version.content.length : 0;
  }

  onVersionSelect(versionNumber: number): void {
    this.versionSelect.emit(versionNumber);
  }

  onValidateEpisode(): void {
    this.validateEpisode.emit();
  }

  onRegenerateEpisode(): void {
    this.regenerateEpisode.emit();
  }

  onCopyVersionContent(): void {
    this.copyVersionContent.emit();
  }

  onRestoreVersion(): void {
    this.restoreVersion.emit();
  }
}
