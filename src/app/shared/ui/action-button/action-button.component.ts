// Copyright (c) 2026 Perpetuator LLC
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

export type ActionButtonVariant =
  | 'primary'
  | 'neutral'
  | 'secondary'
  | 'tertiary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'ghost';

@Component({
  selector: 'app-action-button',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './action-button.component.html',
  styleUrl: './action-button.component.scss',
})
export class ActionButtonComponent {
  @Input() disabled = false;
  @Input() icon = 'play_arrow';
  @Input() loading = false;
  @Input() time: string | null = null;
  /** Color variant. Defaults to 'primary'. */
  @Input() variant: ActionButtonVariant = 'primary';

  @Output() actionClick = new EventEmitter<void>();

  protected onClick(): void {
    if (this.disabled || this.loading) return;

    this.actionClick.emit();
  }
}
