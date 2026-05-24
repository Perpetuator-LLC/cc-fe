// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, Input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

/**
 * Sub-component that renders a single button cell for the button showcase
 * table. Extracted from the parent template so each variant's `@if` block
 * lives here instead of inflating the parent template's cyclomatic complexity
 * past the lint limit.
 */
@Component({
  selector: 'app-button-cell',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './button-cell.component.html',
})
export class ButtonCellComponent {
  @Input({ required: true }) variantId!: string;
  @Input({ required: true }) directive!: string;
  @Input({ required: true }) cssClass!: string;
  @Input() disabled = false;

  inspect(event: Event): void {
    const button = event.currentTarget as HTMLElement;
    const styles = window.getComputedStyle(button);

    console.log('=== Button Inspection ===');
    console.log('Element:', button);
    console.log('Classes:', button.className);
    console.log('Styles:', {
      borderRadius: styles.borderRadius,
      backgroundColor: styles.backgroundColor,
      color: styles.color,
      border: styles.border,
      boxShadow: styles.boxShadow,
    });
  }
}
