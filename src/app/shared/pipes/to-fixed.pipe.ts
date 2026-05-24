// Copyright (c) 2026 Perpetuator LLC
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'toFixed',
  standalone: true,
})
export class ToFixedPipe implements PipeTransform {
  transform(value: number | null | undefined, digits = 2): string {
    if (value == null) {
      return '';
    }
    return value.toFixed(digits);
  }
}
