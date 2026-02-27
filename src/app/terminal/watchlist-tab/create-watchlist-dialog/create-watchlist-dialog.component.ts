// Copyright (c) 2026 Perpetuator LLC
import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatFormField, MatLabel, MatHint } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';

export interface CreateWatchlistDialogData {
  /** Pre-filled symbols (from clipboard or selection) */
  symbols?: string[];
}

export interface CreateWatchlistDialogResult {
  name: string;
  description?: string;
  symbols: string[];
}

@Component({
  selector: 'app-create-watchlist-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogContent,
    MatDialogActions,
    MatDialogTitle,
    MatFormField,
    MatLabel,
    MatHint,
    MatInput,
    MatButton,
    MatIcon,
    MatTooltip,
  ],
  templateUrl: './create-watchlist-dialog.component.html',
  styleUrl: './create-watchlist-dialog.component.scss',
})
export class CreateWatchlistDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<CreateWatchlistDialogComponent>);
  readonly data = inject<CreateWatchlistDialogData>(MAT_DIALOG_DATA);

  watchlistForm: FormGroup;
  parsedSymbolCount = 0;

  constructor() {
    // Pre-fill symbols if provided (e.g., from selection or clipboard)
    const initialSymbols = this.data?.symbols?.join(', ') || '';
    this.parsedSymbolCount = this.data?.symbols?.length || 0;

    this.watchlistForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(1)]],
      description: [''],
      symbols: [initialSymbols],
    });

    // Update parsed count when symbols input changes
    this.watchlistForm.get('symbols')?.valueChanges.subscribe((value: string) => {
      this.parsedSymbolCount = this.parseSymbols(value).length;
    });
  }

  /**
   * Parse symbols from input text (comma, space, or newline separated)
   */
  private parseSymbols(input: string): string[] {
    if (!input || !input.trim()) return [];

    return input
      .split(/[\s,\n]+/)
      .map((s: string) => s.trim().toUpperCase())
      .filter((s: string) => s.length > 0 && /^[A-Z0-9.-]+$/.test(s));
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onCreate(): void {
    if (this.watchlistForm.valid) {
      const { name, description, symbols } = this.watchlistForm.value;
      const parsedSymbols = this.parseSymbols(symbols);

      const result: CreateWatchlistDialogResult = {
        name: name.trim(),
        description: description?.trim() || undefined,
        symbols: parsedSymbols,
      };

      this.dialogRef.close(result);
    }
  }

  /**
   * Handle paste event to auto-parse clipboard content
   */
  async onPasteSymbols(): Promise<void> {
    try {
      const text = await navigator.clipboard.readText();
      const currentValue = this.watchlistForm.get('symbols')?.value || '';
      const newValue = currentValue ? `${currentValue}, ${text}` : text;
      this.watchlistForm.get('symbols')?.setValue(newValue);
    } catch {
      // Clipboard API may not be available, ignore
    }
  }
}
