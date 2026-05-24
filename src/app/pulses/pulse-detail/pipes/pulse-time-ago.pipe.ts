// Copyright (c) 2026 Perpetuator LLC
import { Pipe, PipeTransform } from '@angular/core';
import { formatTimeAgo } from '../../pulse-status.utils';

@Pipe({
  name: 'pulseTimeAgo',
  standalone: true,
  pure: false,
})
export class PulseTimeAgoPipe implements PipeTransform {
  transform(dateString: string | null | undefined): string {
    return formatTimeAgo(dateString);
  }
}
