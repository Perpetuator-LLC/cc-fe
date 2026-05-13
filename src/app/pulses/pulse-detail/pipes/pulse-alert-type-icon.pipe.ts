// Copyright (c) 2026 Perpetuator LLC
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'pulseAlertTypeIcon',
  standalone: true,
})
export class PulseAlertTypeIconPipe implements PipeTransform {
  transform(type: string): string {
    const icons: Record<string, string> = {
      breaking_news: 'breaking_news',
      price_alert: 'trending_up',
      earnings: 'attach_money',
      sec_filing: 'description',
    };
    return icons[type] ?? 'notifications';
  }
}
