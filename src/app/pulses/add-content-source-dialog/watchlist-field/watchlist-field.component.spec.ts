// Copyright (c) 2026 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Watchlist } from '../../../terminal/terminal.types';
import { WatchlistFieldComponent } from './watchlist-field.component';

function makeWatchlist(uuid: string, name: string, itemCount = 0): Watchlist {
  return { uuid, name, itemCount } as Watchlist;
}

describe('WatchlistFieldComponent', () => {
  let fixture: ComponentFixture<WatchlistFieldComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WatchlistFieldComponent, NoopAnimationsModule],
    }).compileComponents();
    fixture = TestBed.createComponent(WatchlistFieldComponent);
    fixture.componentInstance.form = new FormGroup({
      watchlistUuid: new FormControl('', [Validators.required]),
    });
  });

  it('reports the empty state only after loading finishes', () => {
    fixture.componentInstance.isLoadingWatchlists = true;
    expect(fixture.componentInstance.hasNoWatchlists).toBeFalse();
    fixture.componentInstance.isLoadingWatchlists = false;
    expect(fixture.componentInstance.hasNoWatchlists).toBeTrue();
    fixture.componentInstance.watchlists = [makeWatchlist('w1', 'Tech')];
    expect(fixture.componentInstance.hasNoWatchlists).toBeFalse();
  });

  it('reports the required error from the bound control', () => {
    expect(fixture.componentInstance.hasRequiredError).toBeTrue();
    fixture.componentInstance.form.get('watchlistUuid')!.setValue('w1');
    expect(fixture.componentInstance.hasRequiredError).toBeFalse();
  });

  it('renders the select bound to watchlistUuid', () => {
    fixture.componentInstance.watchlists = [makeWatchlist('w1', 'Tech', 5)];
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('mat-select[formcontrolname="watchlistUuid"]'),
    ).toBeTruthy();
  });
});
