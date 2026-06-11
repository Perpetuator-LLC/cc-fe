// Copyright (c) 2026 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PodcastCardPublicComponent, PublicPodcastDisplay } from './podcast-card-public.component';

function makePodcast(over: Partial<PublicPodcastDisplay> = {}): PublicPodcastDisplay {
  return {
    id: 'p1',
    name: 'Daily Alpha',
    slug: 'daily-alpha',
    description: 'A show',
    imageUrl: 'https://cdn.test/full.png',
    ownerName: 'Nik',
    ownerEmail: 'nik@example.com',
    viewCount: 10,
    categories: {},
    truncatedDescription: 'A show…',
    formattedTimeAgo: '3d ago',
    formattedViewCount: '10',
    ...over,
  } as PublicPodcastDisplay;
}

describe('PodcastCardPublicComponent', () => {
  let fixture: ComponentFixture<PodcastCardPublicComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PodcastCardPublicComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(PodcastCardPublicComponent);
  });

  it('builds the slugged router link and renders the card', () => {
    fixture.componentInstance.podcast = makePodcast();
    fixture.detectChanges();
    expect(fixture.componentInstance.routerLinkPath).toEqual(['/podcasts', 'p1-daily-alpha']);
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Daily Alpha');
    expect(element.textContent).toContain('A show…');
  });

  it('prefers the thumbnail over the full image', () => {
    fixture.componentInstance.podcast = makePodcast({ thumbnailUrl: 'https://cdn.test/thumb.png' });
    expect(fixture.componentInstance.displayImage).toBe('https://cdn.test/thumb.png');
    fixture.componentInstance.podcast = makePodcast({ thumbnailUrl: undefined });
    expect(fixture.componentInstance.displayImage).toBe('https://cdn.test/full.png');
  });
});
