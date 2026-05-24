// Copyright (c) 2026 Perpetuator LLC
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelect, MatOption } from '@angular/material/select';
import { MatIcon } from '@angular/material/icon';
import { Watchlist } from '../../../terminal/terminal.types';

@Component({
  selector: 'app-watchlist-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatSelect, MatOption, MatIcon],
  templateUrl: './watchlist-field.component.html',
  styleUrl: './watchlist-field.component.scss',
})
export class WatchlistFieldComponent {
  @Input({ required: true }) form!: FormGroup;
  @Input() watchlists: Watchlist[] = [];
  @Input() isLoadingWatchlists = false;

  get hasNoWatchlists(): boolean {
    return !this.isLoadingWatchlists && this.watchlists.length === 0;
  }

  get hasRequiredError(): boolean {
    return !!this.form.get('watchlistUuid')?.hasError('required');
  }
}
