// Copyright (c) 2026 Perpetuator LLC
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { Subject, Subscription, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { map } from 'rxjs/operators';
import { Apollo, gql } from 'apollo-angular';
import { ContentSource, ContentSourceInput, ContentSourceType, SearchOptimization } from '../pulses.types';
import { PulsesService } from '../pulses.service';
import { MessageService } from '../../message.service';

interface StockAutocompleteResult {
  symbol: string;
  name: string;
  display: string;
}

export interface EditContentSourceDialogData {
  pulseConfigUuid: string;
  source: ContentSource;
}

@Component({
  selector: 'app-edit-content-source-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatAutocompleteModule,
    MatCheckboxModule,
    MatChipsModule,
    MatExpansionModule,
    MatIconModule,
  ],
  templateUrl: './edit-content-source-dialog.component.html',
  styleUrl: './edit-content-source-dialog.component.scss',
})
export class EditContentSourceDialogComponent implements OnInit, OnDestroy {
  form: FormGroup;
  saving = false;
  private subscriptions = new Subscription();

  // Search optimization info (from existing source or new optimization)
  searchOptimization: SearchOptimization | null = null;

  // Stock autocomplete
  stockSearchQuery$ = new Subject<string>();
  stockSuggestions: StockAutocompleteResult[] = [];
  isSearchingStocks = false;

  constructor(
    private fb: FormBuilder,
    private apollo: Apollo,
    private pulsesService: PulsesService,
    private messageService: MessageService,
    public dialogRef: MatDialogRef<EditContentSourceDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EditContentSourceDialogData,
  ) {
    // For search terms, use the original search term for editing
    const searchTermValue = data.source.searchTermOriginal || data.source.searchTerm || '';

    this.form = this.fb.group({
      searchTerm: [searchTermValue],
      symbol: [data.source.symbol || ''],
      priority: [data.source.priority || 50, [Validators.min(0), Validators.max(100)]],
      customInstructions: [data.source.customInstructions || ''],
      useExactSearch: [false], // Don't optimize, use exact term
    });

    // Set validators based on source type
    if (data.source.sourceType === 'search_term') {
      this.form.get('searchTerm')?.setValidators([Validators.required, Validators.minLength(2)]);
    } else if (data.source.sourceType === 'company') {
      this.form.get('symbol')?.setValidators([Validators.required, Validators.pattern(/^[A-Z]{1,5}$/)]);
    }
  }

  ngOnInit(): void {
    // Setup stock autocomplete
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
          error: () => {
            this.stockSuggestions = [];
            this.isSearchingStocks = false;
          },
        }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

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

  onStockInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.stockSearchQuery$.next(input.value);
  }

  selectStock(stock: StockAutocompleteResult): void {
    this.form.get('symbol')?.setValue(stock.symbol);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.form.invalid || this.saving) return;

    this.saving = true;
    const formValue = this.form.value;
    const source = this.data.source;

    // For search_term sources, use the new updateContentSource mutation
    if (source.sourceType === 'search_term') {
      const reOptimize = !formValue.useExactSearch;

      this.subscriptions.add(
        this.pulsesService
          .updateContentSource(source.uuid, {
            searchTermOriginal: formValue.searchTerm,
            reOptimize,
            priority: formValue.priority,
            customInstructions: formValue.customInstructions || undefined,
          })
          .subscribe({
            next: (updateResult) => {
              this.saving = false;
              this.searchOptimization = updateResult.searchOptimization || null;
              this.messageService.success('Content source updated');
              this.dialogRef.close(updateResult.contentSource);
            },
            error: (err: Error) => {
              this.saving = false;
              this.messageService.error(`Failed to update: ${err.message}`);
            },
          }),
      );
    } else {
      // For other source types, use updateContentSource for priority/active changes
      // or fall back to remove+add if the source type doesn't support update
      const newSource: ContentSourceInput = {
        sourceType: source.sourceType as ContentSourceType,
        priority: formValue.priority,
        customInstructions: formValue.customInstructions || undefined,
      };

      switch (source.sourceType) {
        case 'rss_feed':
          newSource.rssUrl = source.rssUrl || undefined;
          newSource.rssFeedUuid = source.rssFeedUuid || undefined;
          break;
        case 'watchlist':
          newSource.watchlistUuid = source.watchlistUuid || undefined;
          break;
        case 'company':
          newSource.symbol = formValue.symbol.toUpperCase();
          break;
      }

      // For company sources, remove and re-add since the symbol might change
      if (source.sourceType === 'company' && formValue.symbol !== source.symbol) {
        this.subscriptions.add(
          this.pulsesService
            .removeContentSource(source.uuid)
            .pipe(switchMap(() => this.pulsesService.addContentSource(this.data.pulseConfigUuid, newSource)))
            .subscribe({
              next: (addResult) => {
                this.saving = false;
                this.messageService.success('Content source updated');
                this.dialogRef.close(addResult.contentSource);
              },
              error: (addErr: Error) => {
                this.saving = false;
                this.messageService.error(`Failed to update: ${addErr.message}`);
              },
            }),
        );
      } else {
        // Just update priority/instructions
        this.subscriptions.add(
          this.pulsesService
            .updateContentSource(source.uuid, {
              priority: formValue.priority,
              customInstructions: formValue.customInstructions || undefined,
            })
            .subscribe({
              next: (updateResult) => {
                this.saving = false;
                this.messageService.success('Content source updated');
                this.dialogRef.close(updateResult.contentSource);
              },
              error: (updateErr: Error) => {
                this.saving = false;
                this.messageService.error(`Failed to update: ${updateErr.message}`);
              },
            }),
        );
      }
    }
  }
}
