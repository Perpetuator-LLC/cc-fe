// Copyright (c) 2026 Perpetuator LLC
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'pulseSourceTypeLabel',
  standalone: true,
})
export class PulseSourceTypeLabelPipe implements PipeTransform {
  transform(type: string): string {
    const labels: Record<string, string> = {
      rss_feed: 'RSS Feed',
      search_term: 'Search Term',
      watchlist: 'Watchlist',
      company: 'Company',
    };
    return labels[type] ?? type;
  }
}
