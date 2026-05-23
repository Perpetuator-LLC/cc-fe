// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInput } from '@angular/material/input';
import { SafeHtml, DomSanitizer } from '@angular/platform-browser';
import { EpisodeVersion } from '../episode.service';
import { marked } from 'marked';

/** Pre-computed display state attached to each version. */
interface VersionDisplay {
  changeTypeIcon: string;
  changeTypeLabel: string;
  isFullyValidated: boolean;
  validationTooltip: string;
  hasAudio: boolean;
  wordCount: number;
  charCount: number;
}

type VersionWithDisplay = EpisodeVersion & { display: VersionDisplay };

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
  private sanitizer = inject(DomSanitizer);

  @Input() currentVersionNumber: number | null = null;
  @Input() isCurrentVersionFullyValidated = false;
  @Input() currentVersionValidationTooltip = '';

  /** History versions enriched with pre-computed display fields. */
  private _historyVersions: VersionWithDisplay[] = [];
  @Input() set historyVersions(versions: EpisodeVersion[]) {
    this._historyVersions = (versions || []).map((v) => this.enrichVersion(v));
  }
  get historyVersions(): VersionWithDisplay[] {
    return this._historyVersions;
  }

  @Input() set currentVersionChangeType(value: string | null) {
    this._currentChangeType = value;
    this.currentChangeTypeIcon = this.getChangeTypeIcon(value);
    this.currentChangeTypeLabel = this.getChangeTypeLabel(value);
  }
  get currentVersionChangeType(): string | null {
    return this._currentChangeType;
  }
  private _currentChangeType: string | null = null;
  /** Pre-computed icon for current-version change type. */
  currentChangeTypeIcon = 'help_outline';
  /** Pre-computed label for current-version change type. */
  currentChangeTypeLabel = 'Unknown';

  @Input() currentVersionCreator: string | null = null;
  @Input() currentVersionCreatedAt: string | null = null;
  @Input() currentVersionValidationNotes: SafeHtml | null = null;
  @Input() selectedVersionNumber: number | null = null;

  /** Selected version enriched with display fields + parsed markdown notes. */
  private _selectedVersion: VersionWithDisplay | null = null;
  selectedVersionNotesHtml: SafeHtml | null = null;
  @Input() set selectedVersion(v: EpisodeVersion | null) {
    this._selectedVersion = v ? this.enrichVersion(v) : null;
    this.selectedVersionNotesHtml = v?.validationNotes ? this.markdownToHtml(v.validationNotes) : null;
  }
  get selectedVersion(): VersionWithDisplay | null {
    return this._selectedVersion;
  }

  @Output() validateEpisode = new EventEmitter<void>();
  @Output() regenerateEpisode = new EventEmitter<void>();
  @Output() versionSelect = new EventEmitter<number>();
  @Output() copyVersionContent = new EventEmitter<void>();
  @Output() restoreVersion = new EventEmitter<void>();

  /** Build a `VersionWithDisplay` by attaching pre-computed display state. */
  private enrichVersion(v: EpisodeVersion): VersionWithDisplay {
    return {
      ...v,
      display: {
        changeTypeIcon: this.getChangeTypeIcon(v.changeType),
        changeTypeLabel: this.getChangeTypeLabel(v.changeType),
        isFullyValidated: !!(v.validatedCompliance && v.validatedFacts && v.validatedLength),
        validationTooltip: this.buildValidationTooltip(v),
        hasAudio: !!(v.audioUrl && v.audioUrl.trim()),
        wordCount: v.content ? v.content.split(/\s+/).filter(Boolean).length : 0,
        charCount: v.content ? v.content.length : 0,
      },
    };
  }

  private buildValidationTooltip(version: EpisodeVersion): string {
    const parts: string[] = [];
    parts.push(`Facts: ${version.validatedFacts ? '✓' : '✗'}`);
    parts.push(`Length: ${version.validatedLength ? '✓' : '✗'}`);
    parts.push(`Compliance: ${version.validatedCompliance ? '✓' : '✗'}`);
    const status =
      version.validatedCompliance && version.validatedFacts && version.validatedLength ? 'Validated' : 'Not Validated';
    return `${status}\n - ${parts.join('\n - ')}`;
  }

  markdownToHtml(markdown: string | null | undefined): SafeHtml {
    if (!markdown) return '';
    const html = marked.parse(markdown, { async: false }) as string;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

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

    // Map technical names to user-friendly labels
    const labelMap: Record<string, string> = {
      Length_adjustment: 'Length Adjustment',
      length_adjustment: 'Length Adjustment',
      Facts_adjustment: 'Facts Adjustment',
      facts_adjustment: 'Facts Adjustment',
      Compliance_adjustment: 'Compliance Adjustment',
      compliance_adjustment: 'Compliance Adjustment',
      Content_update: 'Content Update',
      content_update: 'Content Update',
      Manual_edit: 'Manual Edit',
      manual_edit: 'Manual Edit',
      Regeneration: 'Regeneration',
      regeneration: 'Regeneration',
      Initial_creation: 'Initial Creation',
      initial_creation: 'Initial Creation',
    };

    // Check if we have a mapped label
    if (labelMap[changeType]) {
      return labelMap[changeType];
    }

    // Fallback: convert underscores to spaces and capitalize each word
    return changeType
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
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

  hasAudio(version: EpisodeVersion): boolean {
    return !!(version.audioUrl && version.audioUrl.trim());
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
