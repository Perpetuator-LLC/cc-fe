// Copyright (c) 2026 Perpetuator LLC
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, Subscription, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { MessageService } from '../../message.service';
import { PulsesService } from '../pulses.service';
import { ContentSourceType, RssFeed } from '../pulses.types';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MatSelect, MatOption } from '@angular/material/select';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatTooltipModule } from '@angular/material/tooltip';
import { WatchlistService } from '../../terminal/watchlist.service';
import { Watchlist } from '../../terminal/terminal.types';
import { Apollo, gql } from 'apollo-angular';

// Stock autocomplete result type
interface StockAutocompleteResult {
  symbol: string;
  name: string;
  display: string;
}

export interface AddContentSourceDialogData {
  pulseConfigUuid: string;
}

@Component({
  selector: 'app-add-content-source-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatProgressSpinner,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButton,
    MatSelect,
    MatOption,
    MatDialogModule,
    MatIcon,
    MatAutocompleteModule,
    MatTooltipModule,
  ],
  templateUrl: './add-content-source-dialog.component.html',
  styleUrl: './add-content-source-dialog.component.scss',
})
export class AddContentSourceDialogComponent implements OnInit, OnDestroy {
  sourceForm: FormGroup;
  private subscriptions = new Subscription();
  isSubmitting = false;

  // RSS Feed autocomplete
  rssSearchQuery$ = new Subject<string>();
  rssFeedSuggestions: RssFeed[] = [];
  isSearchingRssFeeds = false;
  selectedRssFeed: RssFeed | null = null;

  // Watchlist picker
  watchlists: Watchlist[] = [];
  isLoadingWatchlists = false;

  // Stock/Company autocomplete
  stockSearchQuery$ = new Subject<string>();
  stockSuggestions: StockAutocompleteResult[] = [];
  isSearchingStocks = false;
  selectedStock: StockAutocompleteResult | null = null;

  sourceTypes: { value: ContentSourceType; label: string; icon: string }[] = [
    { value: 'rss_feed', label: 'RSS Feed', icon: 'rss_feed' },
    { value: 'search_term', label: 'Search Term', icon: 'search' },
    { value: 'watchlist', label: 'Watchlist', icon: 'list' },
    { value: 'company', label: 'Company Symbol', icon: 'business' },
  ];

  constructor(
    private fb: FormBuilder,
    private messageService: MessageService,
    private pulsesService: PulsesService,
    private watchlistService: WatchlistService,
    private apollo: Apollo,
    public dialogRef: MatDialogRef<AddContentSourceDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AddContentSourceDialogData,
  ) {
    this.sourceForm = this.fb.group({
      sourceType: ['rss_feed', Validators.required],
      rssUrl: [''],
      searchTerm: [''],
      watchlistUuid: [''],
      symbol: [''],
      priority: [50, [Validators.min(0), Validators.max(100)]],
      customInstructions: [''],
    });

    // Update validators based on source type
    this.sourceForm.get('sourceType')?.valueChanges.subscribe((type) => {
      this.updateValidators(type);
    });
  }

  ngOnInit(): void {
    // Load initial list of all RSS feeds (cached)
    this.loadInitialFeeds();

    // Load user's watchlists
    this.loadWatchlists();

    // Setup RSS feed autocomplete search
    this.subscriptions.add(
      this.rssSearchQuery$
        .pipe(
          debounceTime(300),
          distinctUntilChanged(),
          switchMap((query) => {
            // If empty query, use cached list
            if (!query || query.length < 2) {
              return this.pulsesService.getAllRssFeeds();
            }
            // Otherwise use server-side search
            this.isSearchingRssFeeds = true;
            return this.pulsesService.searchRssFeeds(query);
          }),
        )
        .subscribe({
          next: (feeds) => {
            this.rssFeedSuggestions = feeds.slice(0, 20); // Limit for display
            this.isSearchingRssFeeds = false;
          },
          error: (err) => {
            console.error('[AddContentSource] RSS feed search error:', err);
            this.rssFeedSuggestions = [];
            this.isSearchingRssFeeds = false;
          },
        }),
    );

    // Setup stock/company autocomplete search
    this.subscriptions.add(
      this.stockSearchQuery$
        .pipe(
          debounceTime(300),
          distinctUntilChanged(),
          switchMap((query) => {
            if (!query || query.length < 1) {
              return of([]);
            }
            this.isSearchingStocks = true;
            return this.searchStocks(query);
          }),
        )
        .subscribe({
          next: (stocks) => {
            this.stockSuggestions = stocks;
            this.isSearchingStocks = false;
          },
          error: (err) => {
            console.error('[AddContentSource] Stock search error:', err);
            this.stockSuggestions = [];
            this.isSearchingStocks = false;
          },
        }),
    );
  }

  /** Load initial RSS feeds list */
  private loadInitialFeeds(): void {
    this.isSearchingRssFeeds = true;
    this.subscriptions.add(
      this.pulsesService.getAllRssFeeds().subscribe({
        next: (feeds) => {
          this.rssFeedSuggestions = feeds.slice(0, 20);
          this.isSearchingRssFeeds = false;
        },
        error: (err) => {
          console.error('[AddContentSource] Failed to load RSS feeds:', err);
          this.rssFeedSuggestions = [];
          this.isSearchingRssFeeds = false;
        },
      }),
    );
  }

  /** Load user's watchlists for picker */
  private loadWatchlists(): void {
    this.isLoadingWatchlists = true;
    // Load ALL watchlists (not filtered by type) to include user's custom watchlists
    this.subscriptions.add(
      this.watchlistService.loadWatchlists().subscribe({
        next: (watchlists) => {
          // Include all user-created watchlists (custom, favorites)
          // The watchlistType from BE is lowercase
          this.watchlists = watchlists.filter((w) => {
            const type = w.watchlistType?.toLowerCase();
            // Include custom and favorites, exclude search_history and system sectors/industries
            return type === 'custom' || type === 'favorites' || type === 'personal';
          });
          this.isLoadingWatchlists = false;
        },
        error: (err) => {
          console.error('[AddContentSource] Failed to load watchlists:', err);
          this.watchlists = [];
          this.isLoadingWatchlists = false;
        },
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /** Handle RSS feed input change for autocomplete */
  onRssInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.rssSearchQuery$.next(input.value);
    // Clear selected feed when user types
    this.selectedRssFeed = null;
  }

  /** Select an RSS feed from autocomplete */
  selectRssFeed(feed: RssFeed): void {
    this.selectedRssFeed = feed;
    this.sourceForm.patchValue({ rssUrl: feed.url });
  }

  /** Display function for autocomplete - show name or URL */
  displayRssFeed(feed: RssFeed | string | null): string {
    if (!feed) return '';
    if (typeof feed === 'string') return feed;
    return feed.name || feed.url;
  }

  private updateValidators(type: ContentSourceType): void {
    // Reset all field validators
    this.sourceForm.get('rssUrl')?.clearValidators();
    this.sourceForm.get('searchTerm')?.clearValidators();
    this.sourceForm.get('watchlistUuid')?.clearValidators();
    this.sourceForm.get('symbol')?.clearValidators();

    // Set validator for selected type
    switch (type) {
      case 'rss_feed':
        this.sourceForm.get('rssUrl')?.setValidators([Validators.required, Validators.pattern(/^https?:\/\/.+/)]);
        break;
      case 'search_term':
        this.sourceForm.get('searchTerm')?.setValidators([Validators.required, Validators.minLength(2)]);
        break;
      case 'watchlist':
        this.sourceForm.get('watchlistUuid')?.setValidators(Validators.required);
        break;
      case 'company':
        this.sourceForm.get('symbol')?.setValidators([Validators.required, Validators.pattern(/^[A-Z]{1,5}$/)]);
        break;
    }

    // Update validity
    this.sourceForm.get('rssUrl')?.updateValueAndValidity();
    this.sourceForm.get('searchTerm')?.updateValueAndValidity();
    this.sourceForm.get('watchlistUuid')?.updateValueAndValidity();
    this.sourceForm.get('symbol')?.updateValueAndValidity();
  }

  get selectedType(): ContentSourceType {
    return this.sourceForm.get('sourceType')?.value;
  }

  onSubmit(): void {
    if (this.sourceForm.invalid || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    const formValue = this.sourceForm.value;

    const source: {
      sourceType: ContentSourceType;
      rssUrl?: string;
      searchTerm?: string;
      watchlistUuid?: string;
      symbol?: string;
      priority: number;
      customInstructions?: string;
    } = {
      sourceType: formValue.sourceType,
      priority: formValue.priority,
      customInstructions: formValue.customInstructions || undefined,
    };

    // Only include relevant field based on type
    switch (formValue.sourceType) {
      case 'rss_feed':
        source.rssUrl = formValue.rssUrl;
        break;
      case 'search_term':
        source.searchTerm = formValue.searchTerm;
        break;
      case 'watchlist':
        source.watchlistUuid = formValue.watchlistUuid;
        break;
      case 'company':
        source.symbol = formValue.symbol.toUpperCase();
        break;
    }

    this.subscriptions.add(
      this.pulsesService.addContentSource(this.data.pulseConfigUuid, source).subscribe({
        next: (result) => {
          this.isSubmitting = false;
          this.messageService.success('Content source added');
          this.dialogRef.close(result.contentSource);
        },
        error: (err: Error) => {
          this.isSubmitting = false;
          this.messageService.error(`Failed to add content source: ${err.message}`);
        },
      }),
    );
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  // ==================== Stock Autocomplete ====================

  /** Search stocks using autocomplete query */
  private searchStocks(query: string) {
    const AUTOCOMPLETE_QUERY = gql`
      query GetSymbolAutocomplete($query: String!) {
        autocomplete(input: $query, limit: 10) {
          display
          symbol
          name
        }
      }
    `;

    interface AutocompleteResponse {
      autocomplete: { display: string; symbol: string; name: string }[];
    }

    return this.apollo
      .query<AutocompleteResponse>({
        query: AUTOCOMPLETE_QUERY,
        variables: { query },
      })
      .pipe(
        map((result) =>
          (result.data.autocomplete || []).map((item) => ({
            symbol: item.symbol || item.display,
            name: item.name || '',
            display: item.display,
          })),
        ),
      );
  }

  /** Handle stock input change for autocomplete */
  onStockInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.stockSearchQuery$.next(input.value);
    // Clear selected stock when user types
    this.selectedStock = null;
  }

  /** Handle stock selection from autocomplete */
  selectStock(stock: StockAutocompleteResult): void {
    this.selectedStock = stock;
    this.sourceForm.get('symbol')?.setValue(stock.symbol);
  }

  /** Display function for stock autocomplete */
  displayStock(stock: StockAutocompleteResult | string): string {
    if (!stock) return '';
    if (typeof stock === 'string') return stock;
    return stock.symbol;
  }
}
