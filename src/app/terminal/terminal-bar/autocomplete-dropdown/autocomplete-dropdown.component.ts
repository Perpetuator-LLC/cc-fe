// Copyright (c) 2026 Perpetuator LLC
import { Component, ChangeDetectionStrategy, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AutocompleteSuggestion } from '../../terminal.types';
import { SuggestionIconPipe } from './suggestion-icon.pipe';

@Component({
  selector: 'app-terminal-autocomplete',
  standalone: true,
  imports: [CommonModule, MatIconModule, SuggestionIconPipe],
  templateUrl: './autocomplete-dropdown.component.html',
  styleUrl: './autocomplete-dropdown.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TerminalAutocompleteComponent {
  @Input({ required: true }) suggestions: AutocompleteSuggestion[] = [];
  @Input({ required: true }) selectedIndex = -1;

  @Output() selectSuggestion = new EventEmitter<AutocompleteSuggestion>();
  @Output() hoverIndex = new EventEmitter<number>();
}
