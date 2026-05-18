// Copyright (c) 2026 Perpetuator LLC
import { Pipe, PipeTransform } from '@angular/core';

/**
 * Generic pipe that calls a method on the input value.
 * Useful for calling standard JS methods like .toLocaleString(), .toUpperCase(), etc.
 *
 * Usage: {{ value | call:'toLocaleString' }}
 *        {{ value | call:'toUpperCase' }}
 *        {{ value | call:'trim' }}
 */
@Pipe({
  name: 'call',
  standalone: true,
})
export class MethodCallPipe implements PipeTransform {
  transform(value: unknown, method: string, ...args: unknown[]): unknown {
    if (value == null) {
      return value;
    }
    const fn = (value as Record<string, (...a: unknown[]) => unknown>)[method];
    if (typeof fn === 'function') {
      return fn.apply(value, args);
    }
    return value;
  }
}
