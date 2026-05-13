// Copyright (c) 2026 Perpetuator LLC
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ContentSource } from '../../../pulses.types';
import { PulseSourceTypeIconPipe } from '../../pipes/pulse-source-type-icon.pipe';
import { PulseSourceTypeLabelPipe } from '../../pipes/pulse-source-type-label.pipe';

@Component({
  selector: 'app-pulse-content-sources-tab',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatTableModule,
    MatTooltipModule,
    PulseSourceTypeIconPipe,
    PulseSourceTypeLabelPipe,
  ],
  templateUrl: './pulse-content-sources-tab.component.html',
  styleUrl: './pulse-content-sources-tab.component.scss',
})
export class PulseContentSourcesTabComponent {
  @Input() contentSources: ContentSource[] = [];
  @Input() allSymbols: string[] = [];
  @Input() contentSourceColumns: string[] = [];

  @Output() addBulkRssFeeds = new EventEmitter<void>();
  @Output() addContentSource = new EventEmitter<void>();
  @Output() editContentSource = new EventEmitter<ContentSource>();
  @Output() removeContentSource = new EventEmitter<string>();
}
