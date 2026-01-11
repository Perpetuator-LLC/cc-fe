// Copyright (c) 2025-2026 Perpetuator LLC
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
import { debounceTime, distinctUntilChanged, filter, take } from 'rxjs/operators';
import { TerminalService } from '../terminal.service';
import { TerminalWebSocketService, HistorySearchResult } from '../terminal-websocket.service';
import { HistoryEntry, AutocompleteSuggestion, CommandHistoryItem } from '../terminal.types';
import { FqnChipComponent, FqnToken, FqnUtils } from '../../shared/fqn-chip/fqn-chip.component';

/**
 * History entry with match highlighting info
 */
export interface MatchedHistoryEntry {
  item: CommandHistoryItem;
  tokens: FqnToken[];
  matchedText?: string;
  matchStart?: number;
  matchEnd?: number;
  // Pre-computed parts to avoid substring() calls in template
  beforeMatch?: string;
  matchText?: string;
  afterMatch?: string;
}

/**
 * Represents a completed FQN token displayed as a chip
 * @deprecated Use FqnToken from shared component instead
 */
export interface FqnChip {
  fqn: string; // Full FQN: "STOCK:NASDAQ:AAPL" or "COMMAND:CHART"
  display: string; // Display text: "AAPL" or "CHART"
  type: 'stock' | 'command' | 'crypto' | 'index' | 'forex' | 'parameter';
}

@Component({
  selector: 'app-terminal-bar',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule, MatProgressSpinnerModule, FqnChipComponent],
  templateUrl: './terminal-bar.component.html',
  styleUrl: './terminal-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TerminalBarComponent implements OnInit, OnDestroy {
  @ViewChild('commandInput') commandInput!: ElementRef<HTMLInputElement>;
  @ViewChild('inputWrapper') inputWrapper!: ElementRef<HTMLDivElement>;

  // Expose FqnUtils to template
  FqnUtils = FqnUtils;

  // Position for the fixed history dropdown
  historyDropdownStyle = signal<Record<string, string>>({});

  private terminalService = inject(TerminalService);
  private wsService = inject(TerminalWebSocketService);
  private subscriptions = new Subscription();
  private inputSubject = new Subject<string>();
  private blurTimeout: ReturnType<typeof setTimeout> | null = null;
  private historyIndex = -1;
  private currentAutocompleteInput = ''; // Track which input the suggestions are for

  // Signals for reactive state
  chips = signal<FqnChip[]>([]); // Completed FQN tokens as chips
  currentInput = signal(''); // Current text being typed (not yet a chip)
  suggestions = signal<AutocompleteSuggestion[]>([]);
  selectedSuggestionIndex = signal(-1);
  showSuggestions = signal(false);
  userNavigatedSuggestions = signal(false); // True if user used arrow keys to navigate
  isFocused = signal(false); // Track if input is focused
  showHistoryPreview = signal(false); // Show floating history above input

  // Store the original input before navigating history (to restore on escape/down past end)
  private originalInputBeforeHistory = '';

  // True if user has typed something or has chips (not just showing last command)
  hasUserContent = computed(() => {
    return this.chips().length > 0 || this.currentInput().trim().length > 0;
  });

  // Show last command when unfocused and no user content
  showLastCommand = computed(() => {
    return !this.isFocused() && !this.hasUserContent() && this.lastCommandTokens().length > 0;
  });

  // Rolodex-style history: show items ABOVE current selection (older items, what's next on up arrow)
  // With newest-first order: index 0 = most recent, higher index = older
  // When at selectedIdx, show items at selectedIdx+1, +2, +3 (the next older items)
  upcomingHistoryItems = computed<MatchedHistoryEntry[]>(() => {
    const history = this.recentHistory();
    const selectedIdx = this.selectedHistoryIndex();

    // Not navigating history - don't show upcoming
    if (selectedIdx < 0 || history.length === 0) {
      return [];
    }

    // Return items after selectedIdx (older items that will be selected with more up arrows)
    if (selectedIdx >= history.length - 1) {
      return []; // At oldest item, nothing above
    }

    // Get items above (older than) current selection, limited to 3 for a clean look
    const itemsAbove = history.slice(selectedIdx + 1, Math.min(selectedIdx + 4, history.length));
    return itemsAbove;
  });

  // Track the search term for history substring matching
  historySearchTerm = signal('');

  // Selected history index for up/down navigation within matched history
  selectedHistoryIndex = signal(-1);

  // History loading state
  historyLoading = signal(false);
  historyEmpty = signal(false); // True when we've confirmed there's no history
  historyTotalCount = signal(0); // Total history items available on server

  // Computed: remaining history items after current selection
  historyRemainingCount = computed(() => {
    const total = this.historyTotalCount();
    const selectedIdx = this.selectedHistoryIndex();
    if (total === 0 || selectedIdx < 0) return 0;
    // Remaining = total - (selectedIdx + 1) since selectedIdx is 0-based
    return Math.max(0, total - selectedIdx - 1);
  });

  // History items from WebSocket search
  private wsHistoryResults = signal<HistorySearchResult[]>([]);
  private currentHistoryQuery = ''; // Track the current query

  // Get history items - either from WebSocket search or local fallback
  // Kept in server order: newest first (index 0 = most recent)
  // Up arrow = go to higher indices (older items)
  recentHistory = computed<MatchedHistoryEntry[]>(() => {
    const searchTerm = this.historySearchTerm().toLowerCase().trim();
    const wsResults = this.wsHistoryResults();

    // If we have WebSocket results, use them (server returns newest first)
    if (wsResults.length > 0) {
      return wsResults.map((result) => {
        const tokens = FqnUtils.parseCommand(result.rawInput);
        const entry: MatchedHistoryEntry = {
          item: {
            id: result.id,
            rawInput: result.rawInput,
            parsedCommand: result.parsedCommand ?? '',
            parsedSymbols: result.parsedSymbols,
            status: (result.status?.toUpperCase() as CommandHistoryItem['status']) || 'COMPLETED',
            isAiInterpreted: result.isAiInterpreted ?? false,
            createdAt: result.createdAt,
          },
          tokens,
        };

        // Add match highlighting if there's a search term
        if (searchTerm) {
          const lowerInput = result.rawInput.toLowerCase();
          const matchStart = lowerInput.indexOf(searchTerm);
          if (matchStart >= 0) {
            entry.matchedText = searchTerm;
            entry.matchStart = matchStart;
            entry.matchEnd = matchStart + searchTerm.length;
            entry.beforeMatch = result.rawInput.substring(0, matchStart);
            entry.matchText = result.rawInput.substring(matchStart, matchStart + searchTerm.length);
            entry.afterMatch = result.rawInput.substring(matchStart + searchTerm.length);
          }
        }

        return entry;
      });
    }

    // Fallback to local history if WS not available
    // Server returns newest first, so no reverse needed
    const fullHistory = this.terminalService.userHistory();
    let filtered: CommandHistoryItem[];

    if (searchTerm) {
      filtered = fullHistory.filter((item) => item.rawInput.toLowerCase().includes(searchTerm));
    } else {
      filtered = fullHistory;
    }

    // userHistory is already newest first from server
    const recent = filtered;

    return recent.map((item) => {
      const tokens = FqnUtils.parseCommand(item.rawInput);
      const entry: MatchedHistoryEntry = { item, tokens };

      if (searchTerm) {
        const lowerInput = item.rawInput.toLowerCase();
        const matchStart = lowerInput.indexOf(searchTerm);
        if (matchStart >= 0) {
          entry.matchedText = searchTerm;
          entry.matchStart = matchStart;
          entry.matchEnd = matchStart + searchTerm.length;
          entry.beforeMatch = item.rawInput.substring(0, matchStart);
          entry.matchText = item.rawInput.substring(matchStart, matchStart + searchTerm.length);
          entry.afterMatch = item.rawInput.substring(matchStart + searchTerm.length);
        }
      }

      return entry;
    });
  });

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

  // Parse last command into tokens for chip display
  lastCommandTokens = computed<FqnToken[]>(() => {
    const last = this.lastEntry();
    if (!last || !last.input) return [];
    return FqnUtils.parseCommand(last.input);
  });

  isProcessing = computed(() => {
    const last = this.lastEntry();
    return last?.isLoading ?? false;
  });

  ngOnInit(): void {
    // Load full command history from server
    this.subscriptions.add(
      this.terminalService
        .loadCommandHistory(100)
        .pipe(take(1))
        .subscribe({
          next: (history) => {
            console.log('[TerminalBar] Loaded command history:', history.length, 'entries');
          },
          error: (err) => {
            console.warn('[TerminalBar] Failed to load command history:', err);
          },
        }),
    );

    // Debounced autocomplete via WebSocket
    this.subscriptions.add(
      this.inputSubject.pipe(debounceTime(100), distinctUntilChanged()).subscribe((input) => {
        this.requestAutocomplete(input);
        // Update history search term for substring matching
        this.historySearchTerm.set(input);
        // Reset history navigation when input changes
        this.selectedHistoryIndex.set(-1);
      }),
    );

    // Listen for WebSocket autocomplete responses
    this.subscriptions.add(
      this.wsService.onAutocomplete
        .pipe(filter((response) => response.input === this.currentAutocompleteInput))
        .subscribe((response) => {
          console.log('[TerminalBar] WS Autocomplete response:', response);
          // Sort by score (higher = better) if available
          const sorted = [...response.suggestions].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
          this.suggestions.set(sorted);
          // Only auto-select first suggestion if user has typed something (non-empty input)
          // Empty input = show suggestions but don't select any
          const hasUserInput = this.currentInput().trim().length > 0;
          this.selectedSuggestionIndex.set(hasUserInput && sorted.length > 0 ? 0 : -1);
          this.showSuggestions.set(sorted.length > 0);
        }),
    );

    // Listen for WebSocket history search responses
    this.subscriptions.add(
      this.wsService.onHistorySearch
        .pipe(filter((response) => response.query === this.currentHistoryQuery))
        .subscribe((response) => {
          console.log('[TerminalBar] WS History search response:', response);
          this.historyLoading.set(false);
          this.wsHistoryResults.set(response.results);
          this.historyTotalCount.set(response.total ?? response.results.length);
          // Mark as empty if no results returned
          this.historyEmpty.set(response.results.length === 0);
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
      // Case-insensitive FQN check
      const upperInput = pendingInput.toUpperCase();
      const isFqnFormat =
        upperInput.includes('COMMAND:') ||
        upperInput.includes('STOCK:') ||
        upperInput.includes('CRYPTO:') ||
        upperInput.includes('INDEX:');

      if (!isFqnFormat && suggestions.length > 0) {
        const firstSuggestion = suggestions[0];
        if (firstSuggestion.fqn) {
          // Add as chip (this updates the chips signal synchronously)
          // Normalize the FQN to uppercase
          const fqn = FqnUtils.normalize(firstSuggestion.fqn);
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

    // If it's just a symbol without a command, add CHART command (case-insensitive check)
    const hasCommand = finalCommand.toUpperCase().includes('COMMAND:');
    if (!hasCommand && this.chips().some((c) => c.type === 'stock' || c.type === 'crypto' || c.type === 'index')) {
      finalCommand = `${finalCommand} COMMAND:CHART`;
    }

    console.log('[TerminalBar] Executing command:', finalCommand);
    this.terminalService.execute(finalCommand);

    // Clear all
    this.chips.set([]);
    this.currentInput.set('');
    this.historyIndex = -1;
    this.historySearchTerm.set('');
    this.selectedHistoryIndex.set(-1);
    this.wsHistoryResults.set([]);
    this.showHistoryPreview.set(false);
    this.clearSuggestions();
  }

  onKeyDown(event: KeyboardEvent): void {
    const inputEl = this.commandInput?.nativeElement;

    // ========================================
    // Terminal-style keyboard shortcuts (Ctrl)
    // ========================================

    if (event.ctrlKey && !event.metaKey) {
      switch (event.key.toLowerCase()) {
        case 'u':
          // CTRL+U: Clear entire line
          event.preventDefault();
          this.clearInput();
          return;

        case 'a':
          // CTRL+A: Go to beginning of line
          event.preventDefault();
          if (inputEl) {
            inputEl.setSelectionRange(0, 0);
          }
          return;

        case 'e':
          // CTRL+E: Go to end of line
          event.preventDefault();
          if (inputEl) {
            const len = inputEl.value.length;
            inputEl.setSelectionRange(len, len);
          }
          return;

        case 'k':
          // CTRL+K: Kill (delete) from cursor to end of line
          event.preventDefault();
          if (inputEl) {
            const pos = inputEl.selectionStart ?? 0;
            const newValue = inputEl.value.substring(0, pos);
            this.currentInput.set(newValue);
            inputEl.value = newValue;
          }
          return;

        case 'w':
          // CTRL+W: Delete word before cursor
          event.preventDefault();
          if (inputEl) {
            const pos = inputEl.selectionStart ?? 0;
            const text = inputEl.value;
            // Find start of previous word (skip trailing spaces, then find word boundary)
            let i = pos - 1;
            while (i >= 0 && text[i] === ' ') i--;
            while (i >= 0 && text[i] !== ' ') i--;
            const newValue = text.substring(0, i + 1) + text.substring(pos);
            this.currentInput.set(newValue);
            inputEl.value = newValue;
            inputEl.setSelectionRange(i + 1, i + 1);
          }
          return;

        case 'r':
          // CTRL+R: Enter history search mode
          event.preventDefault();
          this.enterHistorySearchMode();
          return;

        case 'l':
          // CTRL+L: Clear/refocus (like clear screen in terminal)
          event.preventDefault();
          this.clearSuggestions();
          this.showHistoryPreview.set(false);
          inputEl?.focus();
          return;

        case 'c':
          // CTRL+C: Cancel current input (clear and defocus)
          event.preventDefault();
          this.clearInput();
          inputEl?.blur();
          return;
      }
    }

    // Alt+Backspace: Delete word before cursor (alternative to CTRL+W)
    if (event.altKey && event.key === 'Backspace') {
      event.preventDefault();
      if (inputEl) {
        const pos = inputEl.selectionStart ?? 0;
        const text = inputEl.value;
        // Find start of previous word
        let i = pos - 1;
        while (i >= 0 && text[i] === ' ') i--;
        while (i >= 0 && text[i] !== ' ') i--;
        const newValue = text.substring(0, i + 1) + text.substring(pos);
        this.currentInput.set(newValue);
        inputEl.value = newValue;
        inputEl.setSelectionRange(i + 1, i + 1);
      }
      return;
    }

    // Home key: Go to beginning
    if (event.key === 'Home' && !event.shiftKey) {
      // Let default behavior work, but if at start with chips, could select chips (future)
    }

    // End key: Go to end
    if (event.key === 'End' && !event.shiftKey) {
      // Default behavior works fine
    }

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
        // Behavior depends on whether user has typed something:
        // - If user typed something and has a selected suggestion: select it, add chip, then execute
        // - If user navigated with arrows: select that suggestion (don't auto-execute)
        // - If nothing typed (empty input): just close suggestions, don't select anything
        const hasUserInput = this.currentInput().trim().length > 0;
        const hasSelection = this.selectedSuggestionIndex() >= 0;

        if (this.userNavigatedSuggestions() && hasSelection) {
          // User explicitly navigated - just add the chip, don't execute yet
          event.preventDefault();
          this.addChipFromSuggestion(this.suggestions()[this.selectedSuggestionIndex()]);
          return;
        } else if (hasUserInput && hasSelection) {
          // User typed something and we have a selection - add chip and execute
          event.preventDefault();
          this.addChipFromSuggestion(this.suggestions()[this.selectedSuggestionIndex()]);
          // Now execute after the chip was added
          this.onSubmit();
          return;
        }
        // No selection or empty input - just execute whatever we have
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
      this.navigateMatchedHistory(-1);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.navigateMatchedHistory(1);
    } else if (event.key === 'ArrowLeft') {
      // Left arrow at beginning of input with chips: edit the last chip
      const inputEl = this.commandInput?.nativeElement;
      const cursorPos = inputEl?.selectionStart ?? 0;
      if (cursorPos === 0 && this.chips().length > 0) {
        event.preventDefault();
        this.removeLastChipAsText();
      }
      // Otherwise, let default left arrow behavior work (move cursor)
    } else if (event.key === 'ArrowRight') {
      // Right arrow at end of input: could potentially auto-complete (future feature)
      // For now, just let default behavior work
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

    // Reset user navigation flag when input changes
    this.userNavigatedSuggestions.set(false);

    // Hide history preview once user starts typing
    if (input.trim()) {
      this.showHistoryPreview.set(false);
    }

    // If input becomes empty, deselect the current suggestion
    if (!input.trim()) {
      this.selectedSuggestionIndex.set(-1);
    }
  }

  onInputFocus(): void {
    if (this.blurTimeout) {
      clearTimeout(this.blurTimeout);
      this.blurTimeout = null;
    }
    this.isFocused.set(true);

    // Fetch recent history from backend when focused (for up arrow navigation)
    if (this.wsService.connectionState() === 'connected') {
      this.currentHistoryQuery = '';
      this.wsService.searchHistory('', 5);
    }

    // Show suggestions on focus if there's input
    if (this.currentInput().trim()) {
      this.updateSuggestions(this.currentInput());
    }
  }

  /**
   * Update the position of the history dropdown to be fixed above the input
   * This ensures it renders above any parent overflow constraints
   */
  private updateHistoryDropdownPosition(): void {
    if (!this.inputWrapper?.nativeElement) return;

    const rect = this.inputWrapper.nativeElement.getBoundingClientRect();
    this.historyDropdownStyle.set({
      position: 'fixed',
      bottom: `${window.innerHeight - rect.top + 8}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
    });
  }

  onInputBlur(): void {
    // Delay hiding suggestions to allow click events to fire
    this.blurTimeout = setTimeout(() => {
      this.showSuggestions.set(false);
      this.showHistoryPreview.set(false);
      this.isFocused.set(false);
    }, 200);
  }

  /**
   * Select a history entry and populate the input
   */
  selectHistoryEntry(entry: MatchedHistoryEntry): void {
    if (!entry.item.rawInput) return;

    // Parse the command into chips using pre-computed tokens
    const chips: FqnChip[] = entry.tokens.map((t) => ({
      fqn: t.fqn,
      display: t.display,
      type: t.type as FqnChip['type'],
    }));

    this.chips.set(chips);
    this.currentInput.set('');
    this.historySearchTerm.set('');
    this.showHistoryPreview.set(false);
    this.focusInput();
  }

  /**
   * Add a chip from an autocomplete suggestion
   */
  addChipFromSuggestion(suggestion: AutocompleteSuggestion): void {
    const rawFqn = suggestion.fqn || suggestion.insert || suggestion.text || suggestion.display;
    // Normalize the FQN to uppercase (STOCK:, COMMAND:, etc.)
    const fqn = FqnUtils.normalize(rawFqn);
    const chipType = this.getChipType(suggestion.type);

    // Extract display name from FQN or use suggestion display
    let display = suggestion.display;
    if (fqn.includes(':')) {
      // For FQN like "STOCK:NASDAQ:AAPL", get "AAPL"
      // For FQN like "COMMAND:CHART", get "CHART"
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

  /**
   * Request autocomplete suggestions via WebSocket
   */
  private requestAutocomplete(input: string): void {
    console.log('[TerminalBar] Requesting autocomplete for:', input);
    // Reset navigation flag when fetching new suggestions
    this.userNavigatedSuggestions.set(false);
    this.currentAutocompleteInput = input;

    // Use WebSocket if connected
    if (this.wsService.connectionState() === 'connected') {
      this.wsService.autocomplete(input, 10);
    } else {
      // Fallback to local suggestions if WebSocket not connected
      console.log('[TerminalBar] WebSocket not connected, using local suggestions');
      const localSuggestions = this.terminalService.getAutocompleteSuggestions(input, 10);
      const sorted = [...localSuggestions].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      this.suggestions.set(sorted);
      // Only auto-select if user has typed something
      const hasUserInput = input.trim().length > 0;
      this.selectedSuggestionIndex.set(hasUserInput && sorted.length > 0 ? 0 : -1);
      this.showSuggestions.set(sorted.length > 0);
    }
  }

  /**
   * @deprecated Use requestAutocomplete instead
   */
  private updateSuggestions(input: string): void {
    this.requestAutocomplete(input);
  }

  private clearSuggestions(): void {
    this.suggestions.set([]);
    this.selectedSuggestionIndex.set(-1);
    this.showSuggestions.set(false);
    this.userNavigatedSuggestions.set(false);
    // Also reset history navigation when clearing suggestions
    this.selectedHistoryIndex.set(-1);
  }

  /**
   * Clear all input (chips and text) - CTRL+U
   */
  private clearInput(): void {
    this.chips.set([]);
    this.currentInput.set('');
    if (this.commandInput?.nativeElement) {
      this.commandInput.nativeElement.value = '';
    }
    this.historySearchTerm.set('');
    this.selectedHistoryIndex.set(-1);
    this.showHistoryPreview.set(false);
    this.clearSuggestions();
  }

  /**
   * Enter history search mode - CTRL+R
   * This focuses on substring matching within command history
   */
  private enterHistorySearchMode(): void {
    const currentText = this.currentInput().trim();

    // Set the search term to current input (or empty for all history)
    this.historySearchTerm.set(currentText);
    this.currentHistoryQuery = currentText;

    // Show loading state
    this.historyLoading.set(true);
    this.historyEmpty.set(false);
    this.showHistoryPreview.set(true);

    // Trigger history search via WebSocket
    if (this.wsService.connectionState() === 'connected') {
      // Request more results for search mode
      this.wsService.searchHistory(currentText, 20);
    } else {
      this.historyLoading.set(false);
    }

    // Set selectedHistoryIndex to -1 so user can navigate with arrow keys
    this.selectedHistoryIndex.set(-1);

    // Focus input
    this.focusInput();
  }

  /**
   * Navigate through matched history (supports substring matching)
   * Rolodex style: current selection appears in input, upcoming items shown above
   * History is newest-first: index 0 = most recent, higher index = older
   * direction: -1 = older (up arrow = increase index), 1 = newer (down arrow = decrease index)
   */
  private navigateMatchedHistory(direction: -1 | 1): void {
    const searchTerm = this.currentInput().trim();

    // First up press - initialize history navigation
    if (direction === -1 && this.selectedHistoryIndex() < 0) {
      // Store original input to restore on escape or down past end
      this.originalInputBeforeHistory = searchTerm;

      // Trigger history search with loading state
      this.historySearchTerm.set(searchTerm);
      this.currentHistoryQuery = searchTerm;
      this.historyLoading.set(true);
      this.historyEmpty.set(false);
      if (this.wsService.connectionState() === 'connected') {
        this.wsService.searchHistory(searchTerm, 10); // Load 10 initially for better navigation
      } else {
        // WebSocket not connected - clear loading, rely on local fallback
        this.historyLoading.set(false);
      }
    }

    const matchedHistory = this.recentHistory();

    if (matchedHistory.length === 0) {
      // Fall back to legacy navigation if no matched history
      const historyCommand = this.terminalService.navigateHistory(direction);
      if (historyCommand !== undefined) {
        this.chips.set([]);
        this.currentInput.set(historyCommand);
      }
      return;
    }

    // Show history preview if not already showing
    if (!this.showHistoryPreview()) {
      this.updateHistoryDropdownPosition();
      this.showHistoryPreview.set(true);
    }

    const currentIdx = this.selectedHistoryIndex();
    let newIdx: number;

    if (direction === -1) {
      // Up arrow - go to older (higher index since newest is at index 0)
      if (currentIdx < 0) {
        // Not navigating yet - start from most recent (index 0)
        newIdx = 0;
      } else if (currentIdx < matchedHistory.length - 1) {
        newIdx = currentIdx + 1;

        // Check if we're approaching the oldest loaded item - load more
        if (
          newIdx >= matchedHistory.length - 2 &&
          !this.historyLoading() &&
          this.wsService.connectionState() === 'connected'
        ) {
          // Load more history in the background
          const currentLimit = this.wsHistoryResults().length;
          console.log('[TerminalBar] Near oldest loaded history, loading more... current:', currentLimit);
          this.wsService.searchHistory(this.currentHistoryQuery, currentLimit + 10);
        }
      } else {
        // Already at oldest - stay there
        return;
      }
    } else {
      // Down arrow - go to newer (lower index)
      if (currentIdx < 0) {
        // Not navigating - do nothing
        return;
      } else if (currentIdx > 0) {
        newIdx = currentIdx - 1;
      } else {
        // At newest (index 0) - clear selection and restore original input
        this.selectedHistoryIndex.set(-1);
        this.showHistoryPreview.set(false);
        this.chips.set([]);
        this.currentInput.set(this.originalInputBeforeHistory);
        return;
      }
    }

    this.selectedHistoryIndex.set(newIdx);

    // Load the selected history entry into the input (rolodex effect)
    const entry = matchedHistory[newIdx];
    if (entry) {
      // Convert tokens to chips
      const chips: FqnChip[] = entry.tokens.map((t) => ({
        fqn: t.fqn,
        display: t.display,
        type: t.type as FqnChip['type'],
      }));
      this.chips.set(chips);
      this.currentInput.set('');
    }
  }

  /**
   * @deprecated Use navigateMatchedHistory instead
   */
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
