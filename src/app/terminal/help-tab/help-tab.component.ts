// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SafeHtml } from '@angular/platform-browser';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TerminalHelp } from '../terminal.types';

/**
 * Enriched help category — per-command alias text is pre-joined so the
 * template avoids method calls during change detection.
 */
export interface HelpCategoryDisplay {
  name: string;
  commands: {
    name: string;
    description?: string;
    aliases?: string[];
    exampleUsage?: string;
    aliasesText: string;
  }[];
}

@Component({
  selector: 'app-help-tab',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './help-tab.component.html',
  styleUrl: './help-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HelpTabComponent {
  /** Whether help content is currently loading. */
  @Input() loading = false;

  /** Raw help payload — used for the AI note footer text. */
  @Input() help: TerminalHelp = { overview: '', categories: [], aiNote: '' };

  /** Pre-rendered overview markdown as safe HTML. */
  @Input() overviewHtml: SafeHtml = '';

  /** Help categories enriched with pre-joined alias strings per command. */
  @Input() helpDisplay: HelpCategoryDisplay[] = [];
}
