// Copyright (c) 2026 Perpetuator LLC
import { NgTemplateOutlet } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

export type PillVariant = 'primary' | 'tertiary' | 'success' | 'warning' | 'error' | 'info' | 'surface';

@Component({
  selector: 'app-pill',
  standalone: true,
  imports: [MatIconModule, NgTemplateOutlet],
  templateUrl: './pill.component.html',
  styleUrl: './pill.component.scss',
})
export class PillComponent {
  @Input() dot = false;
  @Input() icon = '';
  @Input() label = '';
  @Input() variant: PillVariant = 'surface';
}
