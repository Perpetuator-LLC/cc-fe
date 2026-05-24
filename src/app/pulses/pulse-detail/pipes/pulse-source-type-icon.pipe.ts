// Copyright (c) 2026 Perpetuator LLC
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'pulseSourceTypeIcon',
  standalone: true,
})
export class PulseSourceTypeIconPipe implements PipeTransform {
  transform(type: string): string {
    const icons: Record<string, string> = {
      rss_feed: 'rss_feed',
      search_term: 'search',
      watchlist: 'list',
      company: 'business',
    };
    return icons[type] ?? 'source';
  }
}
