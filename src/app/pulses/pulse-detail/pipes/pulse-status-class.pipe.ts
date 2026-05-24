// Copyright (c) 2026 Perpetuator LLC
import { Pipe, PipeTransform } from '@angular/core';
import { getStatusClass } from '../../pulse-status.utils';
import { Pulse } from '../../pulses.types';

@Pipe({
  name: 'pulseStatusClass',
  standalone: true,
  pure: false,
})
export class PulseStatusClassPipe implements PipeTransform {
  transform(pulse: Pulse): string {
    return getStatusClass(pulse.status, pulse);
  }
}
