// Copyright (c) 2026 Perpetuator LLC
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';

export interface StockAutocompleteResult {
  symbol: string;
  name: string;
  display: string;
}

@Component({
  selector: 'app-company-symbol-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatProgressSpinner,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
  ],
  templateUrl: './company-symbol-field.component.html',
  styleUrl: './company-symbol-field.component.scss',
})
export class CompanySymbolFieldComponent {
  @Input({ required: true }) form!: FormGroup;
  @Input() stockSuggestions: StockAutocompleteResult[] = [];
  @Input() isSearchingStocks = false;
  @Input() selectedStock: StockAutocompleteResult | null = null;
  @Input() displayStock: (stock: StockAutocompleteResult | string) => string = () => '';

  @Output() stockInputChange = new EventEmitter<Event>();
  @Output() stockSelected = new EventEmitter<StockAutocompleteResult>();

  get noSuggestions(): boolean {
    return this.stockSuggestions.length === 0 && !this.isSearchingStocks;
  }

  get hasRequiredError(): boolean {
    return !!this.form.get('symbol')?.hasError('required');
  }

  get hasPatternError(): boolean {
    return !!this.form.get('symbol')?.hasError('pattern');
  }

  onOptionSelected(event: MatAutocompleteSelectedEvent): void {
    this.stockSelected.emit(event.option.value);
  }

  onInput(event: Event): void {
    this.stockInputChange.emit(event);
  }
}
