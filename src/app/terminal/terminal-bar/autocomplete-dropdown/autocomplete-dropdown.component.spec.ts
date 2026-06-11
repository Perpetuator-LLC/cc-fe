// Copyright (c) 2026 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AutocompleteSuggestion } from '../../terminal.types';
import { TerminalAutocompleteComponent } from './autocomplete-dropdown.component';

function makeSuggestion(over: Partial<AutocompleteSuggestion> = {}): AutocompleteSuggestion {
  return { fqn: 'aapl', display: 'AAPL', type: 'symbol', ...over } as AutocompleteSuggestion;
}

describe('TerminalAutocompleteComponent', () => {
  let fixture: ComponentFixture<TerminalAutocompleteComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TerminalAutocompleteComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(TerminalAutocompleteComponent);
    element = fixture.nativeElement as HTMLElement;
  });

  it('marks the selected suggestion and shows symbol details', () => {
    fixture.componentInstance.suggestions = [
      makeSuggestion({ symbol: 'AAPL', name: 'Apple Inc', exchange: 'NASDAQ' }),
      makeSuggestion({ fqn: 'help', display: 'help', type: 'command' }),
    ];
    fixture.componentInstance.selectedIndex = 1;
    fixture.detectChanges();

    const items = element.querySelectorAll('.suggestion-item');
    expect(items.length).toBe(2);
    expect(items[0].classList).not.toContain('selected');
    expect(items[1].classList).toContain('selected');
    expect(items[0].textContent).toContain('AAPL');
    expect(items[0].textContent).toContain('- Apple Inc');
    expect(items[0].querySelector('.suggestion-exchange')?.textContent).toContain('NASDAQ');
  });

  it('emits selection on click and hover index on mouseenter', () => {
    const selected: AutocompleteSuggestion[] = [];
    const hovered: number[] = [];
    fixture.componentInstance.suggestions = [makeSuggestion()];
    fixture.componentInstance.selectedIndex = -1;
    fixture.componentInstance.selectSuggestion.subscribe((s) => selected.push(s));
    fixture.componentInstance.hoverIndex.subscribe((i) => hovered.push(i));
    fixture.detectChanges();

    const item = element.querySelector<HTMLElement>('.suggestion-item')!;
    item.dispatchEvent(new Event('mouseenter'));
    item.click();
    expect(hovered).toEqual([0]);
    expect(selected.length).toBe(1);
    expect(selected[0].fqn).toBe('aapl');
  });
});
