// Copyright (c) 2026 Perpetuator LLC
import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

/**
 * Formula Variable interface
 */
export interface FormulaVariable {
  symbol: string;
  name: string;
  value: number;
  editable?: boolean;
  format?: 'percent' | 'currency' | 'number';
  step?: number;
  min?: number;
  max?: number;
}

/**
 * Formula Display Component
 *
 * Displays mathematical formulas in a readable format with variable definitions.
 * Users can optionally edit some variables to see how results change.
 */
@Component({
  selector: 'app-formula-display',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatTooltipModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  templateUrl: './formula-display.component.html',
  styleUrl: './formula-display.component.scss',
})
export class FormulaDisplayComponent {
  @Input() title = '';
  @Input() description = '';
  @Input() formulaHtml = '';
  @Input() variables: FormulaVariable[] = [];
  @Output() variablesChanged = new EventEmitter<Record<string, number>>();

  editMode = signal(false);

  // Use computed property instead of method call in template
  hasEditableVars = computed(() => this.variables.some((v) => v.editable));

  toggleEditMode(): void {
    if (this.editMode()) {
      // Emit current values when exiting edit mode
      const values: Record<string, number> = {};
      this.variables.forEach((v) => {
        values[v.symbol] = v.value;
      });
      this.variablesChanged.emit(values);
    }
    this.editMode.set(!this.editMode());
  }

  onVariableChange(symbol: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const variable = this.variables.find((v) => v.symbol === symbol);
    if (variable) {
      variable.value = parseFloat(input.value);
    }
  }

  formatVariableValue(v: FormulaVariable): string {
    switch (v.format) {
      case 'percent':
        return `${v.value.toFixed(2)}%`;
      case 'currency':
        return `$${v.value.toFixed(2)}`;
      default:
        return v.value.toFixed(2);
    }
  }

  getUnitForVariable(v: FormulaVariable): string {
    switch (v.format) {
      case 'percent':
        return '%';
      case 'currency':
        return '$';
      default:
        return '';
    }
  }
}
