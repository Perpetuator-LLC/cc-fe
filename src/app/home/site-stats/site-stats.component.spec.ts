// Copyright (c) 2026 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SiteStatistics } from '../../interface';
import { SiteStatsComponent } from './site-stats.component';

describe('SiteStatsComponent', () => {
  let fixture: ComponentFixture<SiteStatsComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SiteStatsComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(SiteStatsComponent);
    element = fixture.nativeElement as HTMLElement;
  });

  it('renders six skeleton cards while loading', () => {
    fixture.componentInstance.loading = true;
    fixture.detectChanges();
    expect(element.querySelectorAll('.skeleton-card').length).toBe(6);
  });

  it('renders nothing when not loading and stats are missing', () => {
    fixture.detectChanges();
    expect(element.querySelector('.stats-section')).toBeNull();
  });

  it('renders the stat values once loaded', () => {
    fixture.componentInstance.stats = {
      totalPodcasts: 12,
      enabledPodcasts: 9,
      totalEpisodes: 340,
      liveEpisodes: 200,
      totalNewsArticles: 5400,
      totalVoices: 18,
      recentNewsProcessed: 77,
      totalAudioMinutesPublished: 1234.6,
    } as SiteStatistics;
    fixture.detectChanges();
    const values = Array.from(element.querySelectorAll('.stat-value')).map((v) => v.textContent?.trim());
    expect(values).toContain('12');
    expect(values).toContain('340');
    expect(values).toContain('1,235 min');
    expect(element.querySelectorAll('.skeleton-card').length).toBe(0);
  });
});
