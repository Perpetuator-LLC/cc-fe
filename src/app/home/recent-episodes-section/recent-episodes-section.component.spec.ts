// Copyright (c) 2026 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PublicPodcastDisplay } from '../podcast-card-public/podcast-card-public.component';
import { RecentEpisodesSectionComponent } from './recent-episodes-section.component';

function makePodcast(id: string, name: string): PublicPodcastDisplay {
  return {
    id,
    name,
    slug: name.toLowerCase().replace(/\s/g, '-'),
    description: '',
    imageUrl: '',
    ownerName: '',
    ownerEmail: '',
    viewCount: 0,
    categories: {},
    truncatedDescription: '',
    formattedTimeAgo: '1d ago',
    formattedViewCount: '10',
  } as PublicPodcastDisplay;
}

describe('RecentEpisodesSectionComponent', () => {
  let fixture: ComponentFixture<RecentEpisodesSectionComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecentEpisodesSectionComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(RecentEpisodesSectionComponent);
    element = fixture.nativeElement as HTMLElement;
  });

  it('renders three skeleton cards while loading', () => {
    fixture.componentInstance.loading = true;
    fixture.detectChanges();
    expect(element.querySelectorAll('.skeleton-podcast-card').length).toBe(3);
  });

  it('shows the empty state without podcasts', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance.hasRecent).toBeFalse();
    expect(element.querySelector('.empty-podcasts-state')?.textContent).toContain('No recent episodes available');
  });

  it('renders one public podcast card per podcast', () => {
    fixture.componentInstance.podcasts = [makePodcast('1', 'Alpha'), makePodcast('2', 'Beta')];
    fixture.detectChanges();
    expect(element.querySelectorAll('app-home-podcast-card-public').length).toBe(2);
    expect(element.textContent).toContain('Alpha');
  });
});
