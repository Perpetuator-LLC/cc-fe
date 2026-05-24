// Copyright (c) 2026 Perpetuator LLC
import { Pipe, PipeTransform } from '@angular/core';
import { formatSeconds } from '../../pulse-status.utils';

@Pipe({
  name: 'pulseFormatSeconds',
  standalone: true,
})
export class PulseFormatSecondsPipe implements PipeTransform {
  transform(seconds: number | null | undefined): string {
    return formatSeconds(seconds);
  }
}
