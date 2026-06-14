// Copyright (c) 2026 Perpetuator LLC
import { ElementRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DynamicStyleDirective } from './dynamic-style.directive';

describe('DynamicStyleDirective', () => {
  let element: HTMLDivElement;
  let directive: DynamicStyleDirective;

  beforeEach(() => {
    element = document.createElement('div');
    TestBed.configureTestingModule({
      providers: [{ provide: ElementRef, useValue: new ElementRef(element) }],
    });
    directive = TestBed.runInInjectionContext(() => new DynamicStyleDirective());
  });

  it('applies every style in the map on changes', () => {
    directive.styles = { color: 'red', backgroundColor: 'blue' };
    directive.ngOnChanges();
    expect(element.style.color).toBe('red');
    expect(element.style.backgroundColor).toBe('blue');
  });

  it('does nothing when styles are null', () => {
    directive.styles = null;
    directive.ngOnChanges();
    expect(element.getAttribute('style')).toBeNull();
  });
});
