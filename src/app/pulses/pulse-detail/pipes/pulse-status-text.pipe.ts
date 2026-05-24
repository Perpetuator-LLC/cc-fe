// Copyright (c) 2026 Perpetuator LLC
import { Pipe, PipeTransform } from '@angular/core';
import { getDisplayStatusText } from '../../pulse-status.utils';
import { Pulse } from '../../pulses.types';

@Pipe({
  name: 'pulseStatusText',
  standalone: true,
  pure: false,
})
export class PulseStatusTextPipe implements PipeTransform {
  transform(pulse: Pulse): string {
    return getDisplayStatusText(pulse);
  }
}
