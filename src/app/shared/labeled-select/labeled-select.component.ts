// Copyright (c) 2026 Perpetuator LLC
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatTooltip } from '@angular/material/tooltip';

/** A single option in an {@link LabeledSelectComponent}. */
export interface LabeledSelectOption {
  value: unknown;
  label: string;
  disabled?: boolean;
  /** Optional tooltip shown on hover (e.g. a feed URL). */
  tooltip?: string;
}

/**
 * Reusable labeled single-select dropdown built on `mat-form-field` + `mat-select`.
 * Centralizes the label/option boilerplate (and, via global theming, the look) so
 * dropdowns stay consistent across the app.
 */
@Component({
  selector: 'app-labeled-select',
  standalone: true,
  imports: [MatFormField, MatLabel, MatOption, MatSelect, MatProgressSpinner, MatTooltip],
  templateUrl: './labeled-select.component.html',
  styleUrl: './labeled-select.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LabeledSelectComponent {
  /** Floating label / caption for the field. */
  @Input({ required: true }) label!: string;

  /** Options to render. */
  @Input() options: LabeledSelectOption[] = [];

  /** Currently selected value. */
  @Input() value: unknown = null;

  /** Whether the control is disabled. */
  @Input() disabled = false;

  /** Shows a loading spinner suffix and a disabled "Loading..." option. */
  @Input() loading = false;

  /** Optional leading placeholder option (e.g. "All Feeds"). */
  @Input() placeholderOption: LabeledSelectOption | null = null;

  /** Text shown by the loading option while {@link loading} is true. */
  @Input() loadingText = 'Loading...';

  /** Emitted when the user selects a different value. */
  @Output() valueChange = new EventEmitter<unknown>();

  onSelectionChange(value: unknown): void {
    this.value = value;
    this.valueChange.emit(value);
  }
}
