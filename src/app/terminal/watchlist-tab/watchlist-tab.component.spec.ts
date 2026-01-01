// Copyright (c) 2025-2026 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { WatchlistTabComponent } from './watchlist-tab.component';
import { COMMON_TEST_PROVIDERS } from '../../../testing/test-helpers';

describe('WatchlistTabComponent', () => {
  let component: WatchlistTabComponent;
  let fixture: ComponentFixture<WatchlistTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WatchlistTabComponent, NoopAnimationsModule],
      providers: [...COMMON_TEST_PROVIDERS],
    }).compileComponents();

    fixture = TestBed.createComponent(WatchlistTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have initial loading state as false', () => {
    expect(component.loading()).toBeFalse();
  });

  it('should return symbol actions with proper commands', () => {
    const actions = component.getSymbolActions();
    expect(actions.length).toBe(3);
    expect(actions[0].command).toBe('CHART');
    expect(actions[1].command).toBe('HP');
  });

  it('should return correct asset icons', () => {
    expect(component.getAssetIcon('ETF')).toBe('account_balance');
    expect(component.getAssetIcon('CRYPTO')).toBe('currency_bitcoin');
    expect(component.getAssetIcon('STOCK')).toBe('trending_up');
  });

  it('should return correct watchlist icons', () => {
    expect(component.getWatchlistIcon('SEARCH_HISTORY')).toBe('history');
    expect(component.getWatchlistIcon('FAVORITES')).toBe('star');
    expect(component.getWatchlistIcon('CUSTOM')).toBe('list');
  });
});
