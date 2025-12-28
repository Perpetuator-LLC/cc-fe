// Copyright (c) 2025 Perpetuator LLC
import { Injectable, signal, computed } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, map, tap, catchError, of } from 'rxjs';
import { Watchlist, WatchlistItem } from './terminal.types';

// ============================================================================
// GraphQL Queries & Mutations
// ============================================================================

const GET_WATCHLISTS = gql`
  query GetWatchlists($watchlistType: String) {
    watchlists(watchlistType: $watchlistType) {
      uuid
      name
      description
      watchlistType
      isDefault
      itemCount
      items {
        uuid
        symbol
        displayName
        assetType
        exchange
        sector
        industry
        marketCap
        notes
        accessCount
        lastAccessedAt
      }
    }
  }
`;

const GET_SEARCH_HISTORY = gql`
  query GetSearchHistory($limit: Int) {
    searchHistory(limit: $limit) {
      uuid
      name
      description
      watchlistType
      isDefault
      itemCount
      items {
        uuid
        symbol
        displayName
        assetType
        exchange
        sector
        industry
        marketCap
        accessCount
        lastAccessedAt
      }
    }
  }
`;

const GET_RECENT_SYMBOLS = gql`
  query GetRecentSymbols($limit: Int, $orderBy: String) {
    recentSymbols(limit: $limit, orderBy: $orderBy) {
      symbol
      displayName
      assetType
      exchange
      sector
      industry
      marketCap
      accessCount
      lastAccessedAt
    }
  }
`;

const GET_SECTOR_SYMBOLS = gql`
  query GetSectorSymbols($sector: String!, $limit: Int) {
    sectorSymbols(sector: $sector, limit: $limit) {
      symbol
      displayName
      assetType
      exchange
      sector
      industry
      marketCap
      accessCount
      lastAccessedAt
    }
  }
`;

const GET_INDUSTRY_SYMBOLS = gql`
  query GetIndustrySymbols($industry: String!, $limit: Int) {
    industrySymbols(industry: $industry, limit: $limit) {
      symbol
      displayName
      assetType
      exchange
      sector
      industry
      marketCap
      accessCount
      lastAccessedAt
    }
  }
`;

const GET_GICS_SECTORS = gql`
  query GetGicsSectors {
    gicsSectors
  }
`;

// New catalog queries for system-defined categories
const GET_GICS_INDUSTRIES = gql`
  query GetGicsIndustries {
    gicsIndustries
  }
`;

const GET_EXCHANGES = gql`
  query GetExchanges {
    exchanges
  }
`;

const GET_ALL_SECTOR_SYMBOLS = gql`
  query GetAllSectorSymbols($sector: String!, $limit: Int, $orderBy: String) {
    allSectorSymbols(sector: $sector, limit: $limit, orderBy: $orderBy) {
      symbol
      displayName
      assetType
      exchange
      sector
      industry
      marketCap
      country
      currency
    }
  }
`;

const GET_ALL_INDUSTRY_SYMBOLS = gql`
  query GetAllIndustrySymbols($industry: String!, $limit: Int, $orderBy: String) {
    allIndustrySymbols(industry: $industry, limit: $limit, orderBy: $orderBy) {
      symbol
      displayName
      assetType
      exchange
      sector
      industry
      marketCap
      country
      currency
    }
  }
`;

const GET_EXCHANGE_SYMBOLS = gql`
  query GetExchangeSymbols($exchange: String!, $limit: Int, $orderBy: String) {
    exchangeSymbols(exchange: $exchange, limit: $limit, orderBy: $orderBy) {
      symbol
      displayName
      assetType
      exchange
      sector
      industry
      marketCap
      country
      currency
    }
  }
`;

const SEARCH_STOCK_LISTINGS = gql`
  query SearchStockListings($symbol: String, $limit: Int) {
    stockListings(symbol: $symbol, limit: $limit) {
      symbol
      name
      exchange
      assetType
      status
    }
  }
`;

const ADD_TO_WATCHLIST = gql`
  mutation AddToWatchlist(
    $symbol: String!
    $watchlistId: UUID
    $displayName: String
    $assetType: String
    $exchange: String
  ) {
    addToWatchlist(
      symbol: $symbol
      watchlistId: $watchlistId
      displayName: $displayName
      assetType: $assetType
      exchange: $exchange
    ) {
      success
      message
      item {
        uuid
        symbol
        displayName
        accessCount
      }
    }
  }
`;

const REMOVE_FROM_WATCHLIST = gql`
  mutation RemoveFromWatchlist($watchlistId: UUID!, $symbol: String!) {
    removeFromWatchlist(watchlistId: $watchlistId, symbol: $symbol) {
      success
      message
    }
  }
`;

const CREATE_WATCHLIST = gql`
  mutation CreateWatchlist($name: String!, $description: String) {
    createWatchlist(name: $name, description: $description) {
      success
      message
      watchlist {
        uuid
        name
        description
        watchlistType
        isDefault
        itemCount
        items {
          uuid
          symbol
          displayName
        }
      }
    }
  }
`;

const DELETE_WATCHLIST = gql`
  mutation DeleteWatchlist($watchlistId: UUID!) {
    deleteWatchlist(watchlistId: $watchlistId) {
      success
      message
    }
  }
`;

const RENAME_WATCHLIST = gql`
  mutation RenameWatchlist($watchlistId: UUID!, $name: String!, $description: String) {
    renameWatchlist(watchlistId: $watchlistId, name: $name, description: $description) {
      success
      message
      watchlist {
        uuid
        name
        description
      }
    }
  }
`;

const DUPLICATE_WATCHLIST = gql`
  mutation DuplicateWatchlist($watchlistId: UUID!, $name: String!) {
    duplicateWatchlist(watchlistId: $watchlistId, name: $name) {
      success
      message
      watchlist {
        uuid
        name
        description
        watchlistType
        isDefault
        itemCount
        items {
          uuid
          symbol
          displayName
        }
      }
    }
  }
`;

// ============================================================================
// Response Interfaces
// ============================================================================

interface WatchlistsResponse {
  watchlists: Watchlist[];
}

interface SearchHistoryResponse {
  searchHistory: Watchlist;
}

interface RecentSymbolsResponse {
  recentSymbols: WatchlistItem[];
}

interface SectorSymbolsResponse {
  sectorSymbols: WatchlistItem[];
}

interface IndustrySymbolsResponse {
  industrySymbols: WatchlistItem[];
}

interface GicsSectorsResponse {
  gicsSectors: string[];
}

interface GicsIndustriesResponse {
  gicsIndustries: string[];
}

interface ExchangesResponse {
  exchanges: string[];
}

// Catalog symbol type from system catalog
export interface CatalogSymbol {
  symbol: string;
  displayName?: string;
  assetType?: string;
  exchange?: string;
  sector?: string;
  industry?: string;
  marketCap?: number;
  country?: string;
  currency?: string;
}

interface AllSectorSymbolsResponse {
  allSectorSymbols: CatalogSymbol[];
}

interface AllIndustrySymbolsResponse {
  allIndustrySymbols: CatalogSymbol[];
}

interface ExchangeSymbolsResponse {
  exchangeSymbols: CatalogSymbol[];
}

export interface StockListing {
  symbol: string;
  name: string;
  exchange: string;
  assetType: string;
  status: string;
}

interface SearchStockListingsResponse {
  stockListings: StockListing[];
}

interface AddToWatchlistResponse {
  addToWatchlist: {
    success: boolean;
    message: string;
    item: WatchlistItem;
  };
}

interface RemoveFromWatchlistResponse {
  removeFromWatchlist: {
    success: boolean;
    message: string;
  };
}

interface CreateWatchlistResponse {
  createWatchlist: {
    success: boolean;
    message: string;
    watchlist: Watchlist;
  };
}

interface DeleteWatchlistResponse {
  deleteWatchlist: {
    success: boolean;
    message: string;
  };
}

interface RenameWatchlistResponse {
  renameWatchlist: {
    success: boolean;
    message: string;
    watchlist: Watchlist;
  };
}

interface DuplicateWatchlistResponse {
  duplicateWatchlist: {
    success: boolean;
    message: string;
    watchlist: Watchlist;
  };
}

// ============================================================================
// Service
// ============================================================================

@Injectable({
  providedIn: 'root',
})
export class WatchlistService {
  // State signals
  private _watchlists = signal<Watchlist[]>([]);
  private _searchHistory = signal<Watchlist | null>(null);
  private _recentSymbols = signal<WatchlistItem[]>([]);
  private _gicsSectors = signal<string[]>([]);
  private _gicsIndustries = signal<string[]>([]);
  private _exchanges = signal<string[]>([]);
  private _loading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  // Public computed signals
  readonly watchlists = this._watchlists.asReadonly();
  readonly searchHistory = this._searchHistory.asReadonly();
  readonly recentSymbols = this._recentSymbols.asReadonly();
  readonly gicsSectors = this._gicsSectors.asReadonly();
  readonly gicsIndustries = this._gicsIndustries.asReadonly();
  readonly exchanges = this._exchanges.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // Get custom watchlists only
  readonly customWatchlists = computed(() => {
    const watchlists = this._watchlists();
    return (watchlists || []).filter((w) => w.watchlistType === 'CUSTOM');
  });

  // Get favorites watchlist
  readonly favorites = computed(() => {
    const watchlists = this._watchlists();
    return (watchlists || []).find((w) => w.watchlistType === 'FAVORITES');
  });

  constructor(private apollo: Apollo) {}

  /**
   * Load all watchlists for the user
   */
  loadWatchlists(watchlistType?: string): Observable<Watchlist[]> {
    this._loading.set(true);
    this._error.set(null);

    return this.apollo
      .query<WatchlistsResponse>({
        query: GET_WATCHLISTS,
        variables: { watchlistType },
        fetchPolicy: 'network-only',
      })
      .pipe(
        map((result) => result.data.watchlists),
        tap((watchlists) => {
          this._watchlists.set(watchlists);
          this._loading.set(false);
        }),
        catchError((error) => {
          console.error('[WatchlistService] Watchlists error:', error.message);
          this._error.set(error.message);
          this._loading.set(false);
          return of([]);
        }),
      );
  }

  /**
   * Load search history watchlist
   */
  loadSearchHistory(limit = 20): Observable<Watchlist | null> {
    this._loading.set(true);
    this._error.set(null);

    return this.apollo
      .query<SearchHistoryResponse>({
        query: GET_SEARCH_HISTORY,
        variables: { limit },
        fetchPolicy: 'network-only',
      })
      .pipe(
        map((result) => result.data.searchHistory),
        tap((history) => {
          this._searchHistory.set(history);
          this._loading.set(false);
        }),
        catchError((error) => {
          console.error('[WatchlistService] Search history error:', error.message);
          this._error.set(error.message);
          this._loading.set(false);
          return of(null);
        }),
      );
  }

  /**
   * Load recent symbols for quick access
   * @param limit - Max number of symbols
   * @param orderBy - Sort order: 'marketCap', 'accessCount', 'lastAccessedAt', or 'symbol'
   */
  loadRecentSymbols(limit = 10, orderBy = 'lastAccessedAt'): Observable<WatchlistItem[]> {
    return this.apollo
      .query<RecentSymbolsResponse>({
        query: GET_RECENT_SYMBOLS,
        variables: { limit, orderBy },
        fetchPolicy: 'network-only',
      })
      .pipe(
        map((result) => result.data.recentSymbols),
        tap((symbols) => {
          this._recentSymbols.set(symbols);
        }),
        catchError((error) => {
          console.error('[WatchlistService] Recent symbols error:', error);
          return of([]);
        }),
      );
  }

  /**
   * Load symbols filtered by sector (from user's watchlists)
   */
  loadSectorSymbols(sector: string, limit = 50): Observable<WatchlistItem[]> {
    return this.apollo
      .query<SectorSymbolsResponse>({
        query: GET_SECTOR_SYMBOLS,
        variables: { sector, limit },
        fetchPolicy: 'network-only',
      })
      .pipe(
        map((result) => result.data.sectorSymbols || []),
        catchError(() => of([])),
      );
  }

  /**
   * Load symbols filtered by industry (from user's watchlists)
   */
  loadIndustrySymbols(industry: string, limit = 50): Observable<WatchlistItem[]> {
    return this.apollo
      .query<IndustrySymbolsResponse>({
        query: GET_INDUSTRY_SYMBOLS,
        variables: { industry, limit },
        fetchPolicy: 'network-only',
      })
      .pipe(
        map((result) => result.data.industrySymbols || []),
        catchError(() => of([])),
      );
  }

  /**
   * Load GICS sector names from backend
   */
  loadGicsSectors(): Observable<string[]> {
    return this.apollo
      .query<GicsSectorsResponse>({
        query: GET_GICS_SECTORS,
        fetchPolicy: 'cache-first',
      })
      .pipe(
        map((result) => result.data.gicsSectors || []),
        tap((sectors) => {
          this._gicsSectors.set(sectors);
        }),
        catchError(() => of([])),
      );
  }

  /**
   * Load GICS industry names from backend
   */
  loadGicsIndustries(): Observable<string[]> {
    return this.apollo
      .query<GicsIndustriesResponse>({
        query: GET_GICS_INDUSTRIES,
        fetchPolicy: 'cache-first',
      })
      .pipe(
        map((result) => result.data.gicsIndustries || []),
        tap((industries) => {
          this._gicsIndustries.set(industries);
        }),
        catchError(() => of([])),
      );
  }

  /**
   * Load exchange names from backend
   */
  loadExchanges(): Observable<string[]> {
    return this.apollo
      .query<ExchangesResponse>({
        query: GET_EXCHANGES,
        fetchPolicy: 'cache-first',
      })
      .pipe(
        map((result) => result.data.exchanges || []),
        tap((exchanges) => {
          this._exchanges.set(exchanges);
        }),
        catchError(() => of([])),
      );
  }

  /**
   * Load ALL symbols in a sector from system catalog (not user watchlists)
   */
  loadAllSectorSymbols(sector: string, limit = 100, orderBy = 'marketCap'): Observable<CatalogSymbol[]> {
    return this.apollo
      .query<AllSectorSymbolsResponse>({
        query: GET_ALL_SECTOR_SYMBOLS,
        variables: { sector, limit, orderBy },
        fetchPolicy: 'network-only',
      })
      .pipe(
        map((result) => result.data.allSectorSymbols || []),
        catchError(() => of([])),
      );
  }

  /**
   * Load ALL symbols in an industry from system catalog
   */
  loadAllIndustrySymbols(industry: string, limit = 100, orderBy = 'marketCap'): Observable<CatalogSymbol[]> {
    return this.apollo
      .query<AllIndustrySymbolsResponse>({
        query: GET_ALL_INDUSTRY_SYMBOLS,
        variables: { industry, limit, orderBy },
        fetchPolicy: 'network-only',
      })
      .pipe(
        map((result) => result.data.allIndustrySymbols || []),
        catchError(() => of([])),
      );
  }

  /**
   * Load ALL symbols on an exchange from system catalog
   */
  loadExchangeSymbols(exchange: string, limit = 100, orderBy = 'marketCap'): Observable<CatalogSymbol[]> {
    return this.apollo
      .query<ExchangeSymbolsResponse>({
        query: GET_EXCHANGE_SYMBOLS,
        variables: { exchange, limit, orderBy },
        fetchPolicy: 'network-only',
      })
      .pipe(
        map((result) => result.data.exchangeSymbols || []),
        catchError(() => of([])),
      );
  }

  /**
   * Search for stock listings by symbol (for autocomplete)
   * @param query - Symbol or partial symbol to search
   * @param limit - Max number of results
   */
  searchStockListings(query: string, limit = 10): Observable<StockListing[]> {
    if (!query || query.length < 1) {
      return of([]);
    }

    return this.apollo
      .query<SearchStockListingsResponse>({
        query: SEARCH_STOCK_LISTINGS,
        variables: { symbol: query.toUpperCase(), limit },
        fetchPolicy: 'cache-first',
      })
      .pipe(
        map((result) => result.data.stockListings || []),
        map((listings) => listings.filter((l) => l.status === 'Active')),
        catchError(() => of([])),
      );
  }

  /**
   * Add a symbol to a watchlist
   */
  addToWatchlist(
    symbol: string,
    watchlistId?: string,
    displayName?: string,
    assetType?: string,
    exchange?: string,
  ): Observable<{ success: boolean; message: string; item?: WatchlistItem }> {
    return this.apollo
      .mutate<AddToWatchlistResponse>({
        mutation: ADD_TO_WATCHLIST,
        variables: { symbol, watchlistId, displayName, assetType, exchange },
      })
      .pipe(
        map((result) => result.data!.addToWatchlist),
        tap((response) => {
          if (response.success) {
            // Reload watchlists to get updated data
            this.loadWatchlists().subscribe();
          }
        }),
        catchError((error) => of({ success: false, message: error.message })),
      );
  }

  /**
   * Remove a symbol from a watchlist
   */
  removeFromWatchlist(watchlistId: string, symbol: string): Observable<{ success: boolean; message: string }> {
    return this.apollo
      .mutate<RemoveFromWatchlistResponse>({
        mutation: REMOVE_FROM_WATCHLIST,
        variables: { watchlistId, symbol },
      })
      .pipe(
        map((result) => result.data!.removeFromWatchlist),
        tap((response) => {
          if (response.success) {
            // Update local state
            this._watchlists.update((lists) =>
              lists.map((list) => {
                if (list.uuid === watchlistId) {
                  return {
                    ...list,
                    items: list.items.filter((i) => i.symbol !== symbol),
                    itemCount: list.itemCount - 1,
                  };
                }
                return list;
              }),
            );
            // Also update search history if applicable
            const history = this._searchHistory();
            if (history?.uuid === watchlistId) {
              this._searchHistory.set({
                ...history,
                items: history.items.filter((i) => i.symbol !== symbol),
                itemCount: history.itemCount - 1,
              });
            }
          }
        }),
        catchError((error) => of({ success: false, message: error.message })),
      );
  }

  /**
   * Create a new watchlist
   */
  createWatchlist(
    name: string,
    description?: string,
  ): Observable<{ success: boolean; message: string; watchlist?: Watchlist }> {
    return this.apollo
      .mutate<CreateWatchlistResponse>({
        mutation: CREATE_WATCHLIST,
        variables: { name, description },
      })
      .pipe(
        map((result) => result.data!.createWatchlist),
        tap((response) => {
          if (response.success && response.watchlist) {
            this._watchlists.update((lists) => [...lists, response.watchlist]);
          }
        }),
        catchError((error) => of({ success: false, message: error.message })),
      );
  }

  /**
   * Delete a watchlist
   */
  deleteWatchlist(watchlistId: string): Observable<{ success: boolean; message: string }> {
    return this.apollo
      .mutate<DeleteWatchlistResponse>({
        mutation: DELETE_WATCHLIST,
        variables: { watchlistId },
      })
      .pipe(
        map((result) => result.data!.deleteWatchlist),
        tap((response) => {
          if (response.success) {
            this._watchlists.update((lists) => lists.filter((l) => l.uuid !== watchlistId));
          }
        }),
        catchError((error) => of({ success: false, message: error.message })),
      );
  }

  /**
   * Rename a watchlist
   */
  renameWatchlist(
    watchlistId: string,
    name: string,
    description?: string,
  ): Observable<{ success: boolean; message: string; watchlist?: Watchlist }> {
    return this.apollo
      .mutate<RenameWatchlistResponse>({
        mutation: RENAME_WATCHLIST,
        variables: { watchlistId, name, description },
      })
      .pipe(
        map((result) => result.data!.renameWatchlist),
        tap((response) => {
          if (response.success && response.watchlist) {
            this._watchlists.update((lists) =>
              lists.map((l) =>
                l.uuid === watchlistId ? { ...l, name, description: description || l.description } : l,
              ),
            );
          }
        }),
        catchError((error) => of({ success: false, message: error.message })),
      );
  }

  /**
   * Duplicate a watchlist
   */
  duplicateWatchlist(
    watchlistId: string,
    name: string,
  ): Observable<{ success: boolean; message: string; watchlist?: Watchlist }> {
    return this.apollo
      .mutate<DuplicateWatchlistResponse>({
        mutation: DUPLICATE_WATCHLIST,
        variables: { watchlistId, name },
      })
      .pipe(
        map((result) => result.data!.duplicateWatchlist),
        tap((response) => {
          if (response.success && response.watchlist) {
            this._watchlists.update((lists) => [...lists, response.watchlist]);
          }
        }),
        catchError((error) => of({ success: false, message: error.message })),
      );
  }

  /**
   * Clear all state
   */
  clear(): void {
    this._watchlists.set([]);
    this._searchHistory.set(null);
    this._recentSymbols.set([]);
    this._gicsSectors.set([]);
    this._gicsIndustries.set([]);
    this._exchanges.set([]);
    this._error.set(null);
  }
}
