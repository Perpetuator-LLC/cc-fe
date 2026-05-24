// Copyright (c) 2026 Perpetuator LLC
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'startsWith',
  standalone: true,
})
export class StartsWithPipe implements PipeTransform {
  transform(value: string | null | undefined, search: string): boolean {
    if (value == null) {
      return false;
    }
    return value.startsWith(search);
  }
}
