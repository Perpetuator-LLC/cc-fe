// Copyright (c) 2026 Perpetuator LLC
import { Pipe, PipeTransform } from '@angular/core';
import { Pulse } from '../../pulses.types';

@Pipe({
  name: 'pulseCanPlay',
  standalone: true,
})
export class PulseCanPlayPipe implements PipeTransform {
  transform(pulse: Pulse): boolean {
    return Boolean(pulse.audioUrl && (pulse.status === 'READY' || pulse.status === 'DELIVERED'));
  }
}
