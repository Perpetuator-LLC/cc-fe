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
 * Calculation Step interface - shows the work
 */
export interface CalculationStep {
  /** Step label (e.g., "Substituting values:") */
  label?: string;
  /** The expression with numbers substituted (e.g., "4.5% + 1.2 × (10.5% - 4.5%)") */
  expressionHtml: string;
  /** Optional result (e.g., "= 11.7%") */
  result?: string;
}

/**
 * Variable Definition interface - explains what each symbol means
 */
export interface VariableDefinition {
  /** The symbol (can include HTML like subscripts) */
  symbol: string;
  /** Human-readable definition */
  definition: string;
}

/**
 * Formula Display Component
 *
 * Displays mathematical formulas in a readable format with variable definitions.
 * Users can optionally edit some variables to see how results change.
 * Now also supports showing calculation steps with substituted values.
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
  /** Calculation steps showing the work (optional) */
  @Input() calculationSteps: CalculationStep[] = [];
  /** Variable definitions explaining what each symbol means */
  @Input() variableDefinitions: VariableDefinition[] = [];
  /** Final result variable name and value (e.g., "WACC = 9.2%") */
  @Input() resultLabel = '';
  @Input() resultValue = '';
  @Output() variablesChanged = new EventEmitter<Record<string, number>>();

  editMode = signal(false);
  /** Currently hovered variable symbol for highlighting */
  hoveredVariable = signal<string | null>(null);

  // Use computed property instead of method call in template
  hasEditableVars = computed(() => this.variables.some((v) => v.editable));

  /** Get tooltip text for a variable symbol */
  getDefinitionFor(symbol: string): string {
    const def = this.variableDefinitions.find(
      (d) => d.symbol === symbol || d.symbol.replace(/<[^>]*>/g, '') === symbol,
    );
    return def?.definition || '';
  }

  /** Set the hovered variable for highlighting */
  onVariableHover(symbol: string | null): void {
    this.hoveredVariable.set(symbol);
  }

  /** Check if a variable is currently hovered */
  isHighlighted(symbol: string): boolean {
    const hovered = this.hoveredVariable();
    if (!hovered) return false;
    // Strip HTML tags for comparison
    const hoveredClean = hovered.replace(/<[^>]*>/g, '');
    const symbolClean = symbol.replace(/<[^>]*>/g, '');
    return hoveredClean === symbolClean;
  }

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
