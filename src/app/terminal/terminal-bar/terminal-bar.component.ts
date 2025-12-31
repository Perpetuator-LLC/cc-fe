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
  currentCommand = signal('');
  suggestions = signal<AutocompleteSuggestion[]>([]);
  selectedSuggestionIndex = signal(-1);
  showSuggestions = signal(false);

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
    const command = this.currentCommand().trim();
    if (!command || this.isProcessing()) return;

    this.terminalService.execute(command);
    this.currentCommand.set('');
    this.historyIndex = -1;
    this.clearSuggestions();
  }

  onKeyDown(event: KeyboardEvent): void {
    // Handle autocomplete navigation
    if (this.showSuggestions() && this.suggestions().length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        this.selectedSuggestionIndex.set(Math.min(this.selectedSuggestionIndex() + 1, this.suggestions().length - 1));
        return;
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (this.selectedSuggestionIndex() > 0) {
          this.selectedSuggestionIndex.set(this.selectedSuggestionIndex() - 1);
        } else {
          this.clearSuggestions();
        }
        return;
      } else if (event.key === 'Tab') {
        event.preventDefault();
        const idx = this.selectedSuggestionIndex();
        if (idx >= 0) {
          this.selectSuggestion(this.suggestions()[idx]);
        } else if (this.suggestions().length > 0) {
          this.selectSuggestion(this.suggestions()[0]);
        }
        return;
      } else if (event.key === 'Enter') {
        const idx = this.selectedSuggestionIndex();
        if (idx >= 0) {
          event.preventDefault();
          this.selectSuggestion(this.suggestions()[idx]);
          return;
        }
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
    this.currentCommand.set(input);
    this.inputSubject.next(input);
    this.historyIndex = -1;
  }

  onInputFocus(): void {
    if (this.blurTimeout) {
      clearTimeout(this.blurTimeout);
      this.blurTimeout = null;
    }
    // Show suggestions on focus if there's input
    if (this.currentCommand().trim()) {
      this.updateSuggestions(this.currentCommand());
    }
  }

  onInputBlur(): void {
    // Delay hiding suggestions to allow click events to fire
    this.blurTimeout = setTimeout(() => {
      this.showSuggestions.set(false);
    }, 200);
  }

  selectSuggestion(suggestion: AutocompleteSuggestion): void {
    this.currentCommand.set(suggestion.insert);
    this.clearSuggestions();
    this.focusInput();
  }

  getSuggestionIcon(suggestion: AutocompleteSuggestion): string {
    switch (suggestion.type) {
      case 'command':
        return 'terminal';
      case 'alias':
        return 'label';
      case 'symbol':
        return suggestion.assetType === 'ETF' ? 'analytics' : 'trending_up';
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
    this.subscriptions.add(
      this.terminalService.fetchAutocompleteSuggestions(input, 10).subscribe({
        next: (suggestions) => {
          this.suggestions.set(suggestions);
          this.selectedSuggestionIndex.set(-1);
          this.showSuggestions.set(suggestions.length > 0);
        },
        error: () => {
          // Fallback to local suggestions on error
          const localSuggestions = this.terminalService.getAutocompleteSuggestions(input, 10);
          this.suggestions.set(localSuggestions);
          this.selectedSuggestionIndex.set(-1);
          this.showSuggestions.set(localSuggestions.length > 0);
        },
      }),
    );
  }

  private clearSuggestions(): void {
    this.suggestions.set([]);
    this.selectedSuggestionIndex.set(-1);
    this.showSuggestions.set(false);
  }

  private navigateHistory(direction: -1 | 1): void {
    const historyCommand = this.terminalService.navigateHistory(direction);
    if (historyCommand !== undefined) {
      this.currentCommand.set(historyCommand);
      this.historyIndex += direction;
    }
  }
}
