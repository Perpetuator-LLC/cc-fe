// Copyright (c) 2026 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthPodcastDisplay, PodcastCardAuthComponent } from './podcast-card-auth.component';

function makePodcast(over: Partial<AuthPodcastDisplay> = {}): AuthPodcastDisplay {
  return {
    uuid: 'pod-1',
    name: 'Market Pulse',
    enabled: true,
    thumbnailUrl: null,
    team: null,
    formattedTimeAgo: '2d ago',
    formattedViewCount: '1.2k',
    ...over,
  } as AuthPodcastDisplay;
}

describe('PodcastCardAuthComponent', () => {
  let fixture: ComponentFixture<PodcastCardAuthComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PodcastCardAuthComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(PodcastCardAuthComponent);
    element = fixture.nativeElement as HTMLElement;
  });

  it('renders name, stats, badge and placeholder image', () => {
    fixture.componentInstance.podcast = makePodcast();
    fixture.detectChanges();
    expect(element.querySelector('h3')?.textContent).toContain('Market Pulse');
    expect(element.querySelector('.status-badge')?.textContent).toContain('Enabled');
    expect(element.querySelector('.status-badge')?.classList).toContain('enabled');
    expect(element.querySelector('.podcast-placeholder')).toBeTruthy();
    expect(element.querySelector('.team')?.textContent).toContain('(No Team)');
    expect(element.textContent).toContain('2d ago');
    expect(element.textContent).toContain('1.2k');
  });

  it('renders the thumbnail, team name and disabled badge when set', () => {
    fixture.componentInstance.podcast = makePodcast({
      enabled: false,
      thumbnailUrl: 'https://cdn.test/t.png',
      team: { name: 'Alpha Team' } as AuthPodcastDisplay['team'],
    });
    fixture.detectChanges();
    expect(element.querySelector<HTMLImageElement>('img.podcast-image')?.src).toBe('https://cdn.test/t.png');
    expect(element.querySelector('.status-badge')?.textContent).toContain('Disabled');
    expect(element.querySelector('.team')?.textContent).toContain('Team: Alpha Team');
  });
});
