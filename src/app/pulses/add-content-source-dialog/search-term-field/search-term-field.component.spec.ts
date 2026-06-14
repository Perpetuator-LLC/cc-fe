// Copyright (c) 2026 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SearchTermFieldComponent } from './search-term-field.component';

describe('SearchTermFieldComponent', () => {
  let fixture: ComponentFixture<SearchTermFieldComponent>;
  let form: FormGroup;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchTermFieldComponent, NoopAnimationsModule],
    }).compileComponents();
    fixture = TestBed.createComponent(SearchTermFieldComponent);
    form = new FormGroup({
      searchTerm: new FormControl('', [Validators.required, Validators.minLength(2)]),
    });
    fixture.componentInstance.form = form;
    fixture.detectChanges();
  });

  it('binds the input to the searchTerm control', () => {
    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input[matinput]');
    expect(input).toBeTruthy();
    input!.value = 'ai chips';
    input!.dispatchEvent(new Event('input'));
    expect(form.value.searchTerm).toBe('ai chips');
  });

  it('reports the required and minlength error states', () => {
    expect(fixture.componentInstance.hasRequiredError).toBeTrue();
    expect(fixture.componentInstance.hasMinLengthError).toBeFalse();

    form.get('searchTerm')!.setValue('a');
    expect(fixture.componentInstance.hasRequiredError).toBeFalse();
    expect(fixture.componentInstance.hasMinLengthError).toBeTrue();

    form.get('searchTerm')!.setValue('ai');
    expect(fixture.componentInstance.hasRequiredError).toBeFalse();
    expect(fixture.componentInstance.hasMinLengthError).toBeFalse();
  });
});
