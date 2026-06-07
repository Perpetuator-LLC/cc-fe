// Copyright (c) 2026 Perpetuator LLC
import { NgTemplateOutlet } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

export type ChipVariant = 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'error' | 'info' | 'surface';

@Component({
  selector: 'app-chip',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatTooltipModule, NgTemplateOutlet],
  templateUrl: './chip.component.html',
  styleUrl: './chip.component.scss',
})
export class ChipComponent {
  @Input() ariaLabel = '';
  @Input() clickable = true;
  @Input() disabled = false;
  @Input() icon = '';
  @Input() label = '';
  @Input() tooltip = '';
  @Input() variant: ChipVariant = 'surface';

  @Output() chipClick = new EventEmitter<void>();

  protected onClick(): void {
    if (this.disabled || !this.clickable) return;

    this.chipClick.emit();
  }
}
