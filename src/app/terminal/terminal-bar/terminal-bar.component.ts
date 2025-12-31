// Copyright (c) 2025 Perpetuator LLC
import {
  Component,
  ChangeDetectionStrategy,
  HostListener,
  inject,
  computed,
  signal,
  ViewChild,
  ElementRef,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { TerminalService } from '../terminal.service';
import { HistoryEntry, AutocompleteSuggestion } from '../terminal.types';

/**
 * Represents a completed FQN token displayed as a chip
 */
export interface FqnChip {
  fqn: string; // Full FQN: "stock:NASDAQ:AAPL" or "command:CHART"
  display: string; // Display text: "AAPL" or "CHART"
  type: 'stock' | 'command' | 'crypto' | 'index' | 'forex' | 'parameter';
}

@Component({
  selector: 'app-terminal-bar',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule, MatProgressSpinnerModule],
  templateUrl: './terminal-bar.component.html',
  styleUrl: './terminal-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TerminalBarComponent implements OnInit, OnDestroy {
  @ViewChild('commandInput') commandInput!: ElementRef<HTMLInputElement>;

  private terminalService = inject(TerminalService);
  private subscriptions = new Subscription();
  private inputSubject = new Subject<string>();
  private blurTimeout: ReturnType<typeof setTimeout> | null = null;
  private historyIndex = -1;

  // Signals for reactive state
  chips = signal<FqnChip[]>([]); // Completed FQN tokens as chips
  currentInput = signal(''); // Current text being typed (not yet a chip)
  suggestions = signal<AutocompleteSuggestion[]>([]);
  selectedSuggestionIndex = signal(-1);
  showSuggestions = signal(false);
  userNavigatedSuggestions = signal(false); // True if user used arrow keys to navigate

  // Legacy: currentCommand is now computed from chips + currentInput
  currentCommand = computed(() => {
    const chipFqns = this.chips()
      .map((c) => c.fqn)
      .join(' ');
    const input = this.currentInput().trim();
    return chipFqns + (chipFqns && input ? ' ' : '') + input;
  });

  // Get the last command from history
  lastEntry = computed<HistoryEntry | null>(() => {
    const history = this.terminalService.history();
    return history.length > 0 ? history[history.length - 1] : null;
  });

  isProcessing = computed(() => {
    const last = this.lastEntry();
    return last?.isLoading ?? false;
  });

  ngOnInit(): void {
    // Debounced autocomplete
    this.subscriptions.add(
      this.inputSubject.pipe(debounceTime(100), distinctUntilChanged()).subscribe((input) => {
        this.updateSuggestions(input);
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    if (this.blurTimeout) {
      clearTimeout(this.blurTimeout);
    }
  }

  // Global keyboard shortcut: Ctrl+K or Cmd+K to focus input
  @HostListener('document:keydown', ['$event'])
  onGlobalKeyDown(event: KeyboardEvent): void {
    // Ctrl+K or Cmd+K to focus the input
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault();
      this.focusInput();
    }
    // Ctrl+1 or Cmd+1 also focuses
    if ((event.ctrlKey || event.metaKey) && event.key === '1') {
      event.preventDefault();
      this.focusInput();
    }
  }

  focusInput(): void {
    this.commandInput?.nativeElement?.focus();
  }

  onSubmit(): void {
    if (this.isProcessing()) return;

    // Check if there's pending input that should be converted
    const pendingInput = this.currentInput().trim();
    if (pendingInput) {
      const suggestions = this.suggestions();
      const isFqnFormat =
        pendingInput.includes('command:') ||
        pendingInput.includes('stock:') ||
        pendingInput.includes('crypto:') ||
        pendingInput.includes('index:');

      if (!isFqnFormat && suggestions.length > 0) {
        const firstSuggestion = suggestions[0];
        if (firstSuggestion.fqn) {
          // Add as chip (this updates the chips signal synchronously)
          const fqn = firstSuggestion.fqn;
          const chipType = this.getChipType(firstSuggestion.type);
          let display = firstSuggestion.symbol || firstSuggestion.display;
          if (fqn.includes(':')) {
            const parts = fqn.split(':');
            display = parts[parts.length - 1];
          }
          this.chips.update((chips) => [...chips, { fqn, display, type: chipType }]);
          this.currentInput.set('');
        }
      } else if (isFqnFormat) {
        // User typed raw FQN format - just pass through
        // No changes needed - pendingInput will be included in finalCommand
      }
    }

    // Build final command from chips + any remaining text input
    const chipFqns = this.chips()
      .map((c) => c.fqn)
      .join(' ');
    const remainingInput = this.currentInput().trim();
    let finalCommand = chipFqns + (chipFqns && remainingInput ? ' ' : '') + remainingInput;
    finalCommand = finalCommand.trim();

    if (!finalCommand) return;

    // If it's just a symbol without a command, add CHART command
    const hasCommand = finalCommand.includes('command:');
    if (!hasCommand && this.chips().some((c) => c.type === 'stock' || c.type === 'crypto' || c.type === 'index')) {
      finalCommand = `${finalCommand} command:CHART`;
    }

    console.log('[TerminalBar] Executing command:', finalCommand);
    this.terminalService.execute(finalCommand);

    // Clear all
    this.chips.set([]);
    this.currentInput.set('');
    this.historyIndex = -1;
    this.clearSuggestions();
  }

  onKeyDown(event: KeyboardEvent): void {
    // Handle backspace when input is empty - remove last chip and convert to text
    if (event.key === 'Backspace' && this.currentInput() === '' && this.chips().length > 0) {
      event.preventDefault();
      this.removeLastChipAsText();
      return;
    }

    // Handle autocomplete navigation
    if (this.showSuggestions() && this.suggestions().length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        this.selectedSuggestionIndex.set(Math.min(this.selectedSuggestionIndex() + 1, this.suggestions().length - 1));
        this.userNavigatedSuggestions.set(true);
        return;
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (this.selectedSuggestionIndex() > 0) {
          this.selectedSuggestionIndex.set(this.selectedSuggestionIndex() - 1);
          this.userNavigatedSuggestions.set(true);
        } else {
          this.clearSuggestions();
        }
        return;
      } else if (event.key === 'Tab' || event.key === ' ') {
        // SPACE or TAB inserts the selected (or first) suggestion as a chip
        const idx = this.selectedSuggestionIndex();
        const suggestionToInsert = idx >= 0 ? this.suggestions()[idx] : this.suggestions()[0];
        if (suggestionToInsert) {
          event.preventDefault();
          this.addChipFromSuggestion(suggestionToInsert);
          return;
        }
        // If no suggestion, let SPACE pass through normally
        if (event.key === 'Tab') {
          event.preventDefault();
        }
        return;
      } else if (event.key === 'Enter') {
        // Only select suggestion if user explicitly navigated with arrow keys
        // Otherwise, execute the command
        if (this.userNavigatedSuggestions() && this.selectedSuggestionIndex() >= 0) {
          event.preventDefault();
          this.addChipFromSuggestion(this.suggestions()[this.selectedSuggestionIndex()]);
          return;
        }
        // Execute the command
        this.clearSuggestions();
        this.onSubmit();
        return;
      } else if (event.key === 'Escape') {
        event.preventDefault();
        this.clearSuggestions();
        return;
      }
    }

    // History navigation (when no suggestions shown)
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.navigateHistory(-1);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.navigateHistory(1);
    } else if (event.key === 'Enter') {
      this.onSubmit();
    } else if (event.key === 'Escape') {
      this.commandInput?.nativeElement?.blur();
    }
  }

  onInputChange(event: Event): void {
    const input = (event.target as HTMLInputElement).value;
    this.currentInput.set(input);
    this.inputSubject.next(input);
    this.historyIndex = -1;
  }

  onInputFocus(): void {
    if (this.blurTimeout) {
      clearTimeout(this.blurTimeout);
      this.blurTimeout = null;
    }
    // Show suggestions on focus if there's input
    if (this.currentInput().trim()) {
      this.updateSuggestions(this.currentInput());
    }
  }

  onInputBlur(): void {
    // Delay hiding suggestions to allow click events to fire
    this.blurTimeout = setTimeout(() => {
      this.showSuggestions.set(false);
    }, 200);
  }

  /**
   * Add a chip from an autocomplete suggestion
   */
  addChipFromSuggestion(suggestion: AutocompleteSuggestion): void {
    const fqn = suggestion.fqn || suggestion.insert || suggestion.text || suggestion.display;
    const chipType = this.getChipType(suggestion.type);

    // Extract display name from FQN or use suggestion display
    let display = suggestion.display;
    if (fqn.includes(':')) {
      // For FQN like "stock:NASDAQ:AAPL", get "AAPL"
      // For FQN like "command:CHART", get "CHART"
      const parts = fqn.split(':');
      display = parts[parts.length - 1];
    }

    const chip: FqnChip = {
      fqn,
      display,
      type: chipType,
    };

    this.chips.update((chips) => [...chips, chip]);
    this.currentInput.set('');
    this.clearSuggestions();
    this.focusInput();

    // Trigger suggestions for next input
    setTimeout(() => {
      this.updateSuggestions('');
    }, 50);
  }

  /**
   * Convert suggestion type to chip type
   */
  private getChipType(suggestionType: string): FqnChip['type'] {
    switch (suggestionType) {
      case 'symbol':
      case 'stock':
      case 'recent':
        return 'stock';
      case 'command':
      case 'alias':
        return 'command';
      case 'crypto':
        return 'crypto';
      case 'index':
        return 'index';
      case 'forex':
        return 'forex';
      case 'parameter':
        return 'parameter';
      default:
        return 'stock'; // Default to stock for unknown types
    }
  }

  /**
   * Remove a chip at a specific index
   */
  removeChip(index: number): void {
    this.chips.update((chips) => chips.filter((_, i) => i !== index));
    this.focusInput();
  }

  /**
   * Remove the last chip and convert it back to editable text
   */
  removeLastChipAsText(): void {
    const currentChips = this.chips();
    if (currentChips.length === 0) return;

    const lastChip = currentChips[currentChips.length - 1];
    this.chips.update((chips) => chips.slice(0, -1));

    // Convert chip back to display text for editing
    this.currentInput.set(lastChip.display);
    this.focusInput();

    // Position cursor at end and refresh suggestions
    setTimeout(() => {
      const input = this.commandInput?.nativeElement;
      if (input) {
        input.setSelectionRange(input.value.length, input.value.length);
      }
      // Refresh suggestions for the restored text
      this.updateSuggestions(lastChip.display);
    }, 0);
  }

  /**
   * Select a suggestion (legacy - now calls addChipFromSuggestion)
   */
  selectSuggestion(suggestion: AutocompleteSuggestion): void {
    this.addChipFromSuggestion(suggestion);
  }

  getSuggestionIcon(suggestion: AutocompleteSuggestion): string {
    switch (suggestion.type) {
      case 'command':
        return 'terminal';
      case 'alias':
        return 'label';
      case 'symbol':
      case 'stock':
        return suggestion.assetType === 'ETF' ? 'analytics' : 'trending_up';
      case 'crypto':
        return 'currency_bitcoin';
      case 'index':
        return 'show_chart';
      case 'forex':
        return 'currency_exchange';
      case 'recent':
        return 'schedule';
      case 'parameter':
        return 'settings';
      case 'example':
        return 'lightbulb';
      case 'history':
        return 'history';
      case 'history_ai':
        return 'smart_toy';
      case 'natural_language':
        return 'chat';
      default:
        return 'chevron_right';
    }
  }

  private updateSuggestions(input: string): void {
    console.log('[TerminalBar] updateSuggestions called with:', input);
    // Reset navigation flag when fetching new suggestions
    this.userNavigatedSuggestions.set(false);
    this.subscriptions.add(
      this.terminalService.fetchAutocompleteSuggestions(input, 10).subscribe({
        next: (suggestions) => {
          console.log('[TerminalBar] Received suggestions:', suggestions);
          // Sort by score (higher = better) if available
          const sorted = [...suggestions].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
          this.suggestions.set(sorted);
          // Auto-select first suggestion (highest score) for visual indication
          this.selectedSuggestionIndex.set(sorted.length > 0 ? 0 : -1);
          this.showSuggestions.set(sorted.length > 0);
        },
        error: (error) => {
          console.error('[TerminalBar] Autocomplete error:', error);
          // Fallback to local suggestions on error
          const localSuggestions = this.terminalService.getAutocompleteSuggestions(input, 10);
          const sorted = [...localSuggestions].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
          this.suggestions.set(sorted);
          this.selectedSuggestionIndex.set(sorted.length > 0 ? 0 : -1);
          this.showSuggestions.set(sorted.length > 0);
        },
      }),
    );
  }

  private clearSuggestions(): void {
    this.suggestions.set([]);
    this.selectedSuggestionIndex.set(-1);
    this.showSuggestions.set(false);
    this.userNavigatedSuggestions.set(false);
  }

  private navigateHistory(direction: -1 | 1): void {
    const historyCommand = this.terminalService.navigateHistory(direction);
    if (historyCommand !== undefined) {
      // Clear chips and set the history command as raw input
      this.chips.set([]);
      this.currentInput.set(historyCommand);
      this.historyIndex += direction;
    }
  }
}
