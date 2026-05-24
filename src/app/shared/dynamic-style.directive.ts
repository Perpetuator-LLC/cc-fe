// Copyright (c) 2026 Perpetuator LLC
/* Copyright (c) 2026 Perpetuator LLC */
import { Directive, ElementRef, inject, Input, OnChanges } from '@angular/core';

@Directive({
  selector: '[appDynamicStyle]',
  standalone: true,
})
export class DynamicStyleDirective implements OnChanges {
  @Input('appDynamicStyle') styles: Record<string, string> | null = null;

  private readonly el = inject(ElementRef);

  ngOnChanges(): void {
    if (this.styles) {
      for (const [prop, value] of Object.entries(this.styles)) {
        this.el.nativeElement.style[prop] = value;
      }
    }
  }
}
