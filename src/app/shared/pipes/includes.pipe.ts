// Copyright (c) 2026 Perpetuator LLC
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'includes',
  standalone: true,
})
export class IncludesPipe implements PipeTransform {
  transform(value: string | null | undefined, search: string): boolean;
  transform<T>(value: T[] | null | undefined, search: T): boolean;
  transform(value: string | unknown[] | null | undefined, search: unknown): boolean {
    if (value == null) {
      return false;
    }
    if (typeof value === 'string') {
      return value.includes(search as string);
    }
    return value.includes(search);
  }
}
