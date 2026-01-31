// Copyright (c) 2026 Perpetuator LLC
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-research-urls-list',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './research-urls-list.component.html',
  styleUrl: './research-urls-list.component.scss',
})
export class ResearchUrlsListComponent {
  @Input() urls: string[] = [];
  @Input() showHeader = true;
  @Input() description = 'URLs accessed during research and fact-checking.';
}
