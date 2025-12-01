// Copyright (c) 2025 Perpetuator LLC
import { ComponentFixture, fakeAsync, TestBed } from '@angular/core/testing';
import { AutocompleteComponent } from './autocomplete.component';
import { Apollo } from 'apollo-angular';
import { of } from 'rxjs';
import { ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApolloQueryResult } from '@apollo/client/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { AutocompleteResult } from '../types';
import { startWith, switchMap } from 'rxjs/operators';

describe('AutocompleteComponent', () => {
  let component: AutocompleteComponent;
  let fixture: ComponentFixture<AutocompleteComponent>;
  let apolloSpy: jasmine.SpyObj<Apollo>;

  beforeEach(async () => {
    const apolloMock = jasmine.createSpyObj('Apollo', ['query']);

    const mockQueryResult: ApolloQueryResult<{ getAutocomplete: { results: AutocompleteResult[] } }> = {
      data: { getAutocomplete: { results: [] } },
      loading: false,
      networkStatus: 7,
    };

    apolloMock.query.and.returnValue(of(mockQueryResult));

    await TestBed.configureTestingModule({
      imports: [
        ReactiveFormsModule,
        MatAutocompleteModule,
        MatInputModule,
        MatFormFieldModule,
        MatCardModule,
        MatTooltipModule,
        AutocompleteComponent,
        NoopAnimationsModule,
      ],
      providers: [{ provide: Apollo, useValue: apolloMock }],
    }).compileComponents();

    apolloSpy = TestBed.inject(Apollo) as jasmine.SpyObj<Apollo>;

    fixture = TestBed.createComponent(AutocompleteComponent);
    component = fixture.componentInstance;

    // NOTE: This is a workaround to bypass the debounceTime operator which doesn't seem to work with tick(300), etc...
    component.filteredOptions = component.tickerControl.valueChanges.pipe(
      startWith(''),
      switchMap((value) => component['_filter'](value || '')),
    );

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should filter options when a value is entered', fakeAsync(() => {
    component.tickerControl.setValue('test');
    fixture.detectChanges();
    expect(apolloSpy.query).toHaveBeenCalled();
  }));

  it('should emit optionSelected event when an option is selected', () => {
    spyOn(component.optionSelected, 'emit');
    component.onOptionSelected({ option: { value: 'test' } });

    expect(component.optionSelected.emit).toHaveBeenCalledWith('test');
  });

  it('should emit enterPressed event if Enter is pressed and input matches an option', () => {
    spyOn(component.enterPressed, 'emit');
    component.tickerControl.setValue('match');
    component.filteredOptions = of([{ symbol: 'match', name: 'Match', cik: '123' }]);
    const event = new KeyboardEvent('keydown', { key: 'Enter' });

    component.onKeydown(event);
    fixture.detectChanges();

    expect(component.enterPressed.emit).toHaveBeenCalled();
  });

  it('should emit valueSubmitted event if Enter is pressed and input does not match any option', () => {
    spyOn(component.valueSubmitted, 'emit');
    component.tickerControl.setValue('non-match');
    component.filteredOptions = of([{ symbol: 'match', name: 'Match', cik: '123' }]);
    const event = new KeyboardEvent('keydown', { key: 'Enter' });

    component.onKeydown(event);
    fixture.detectChanges();

    expect(component.valueSubmitted.emit).toHaveBeenCalledWith('non-match');
  });
});
