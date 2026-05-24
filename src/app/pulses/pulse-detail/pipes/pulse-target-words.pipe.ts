// Copyright (c) 2026 Perpetuator LLC
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'pulseTargetWords',
  standalone: true,
})
export class PulseTargetWordsPipe implements PipeTransform {
  transform(minutes: number | null | undefined, wordsPerMinute: number | null | undefined): number {
    return (minutes || 0) * (wordsPerMinute || 150);
  }
}
