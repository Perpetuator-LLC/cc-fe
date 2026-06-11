// Copyright (c) 2026 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EpisodeResearchUrlsComponent } from './episode-research-urls.component';

describe('EpisodeResearchUrlsComponent', () => {
  let fixture: ComponentFixture<EpisodeResearchUrlsComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EpisodeResearchUrlsComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(EpisodeResearchUrlsComponent);
    element = fixture.nativeElement as HTMLElement;
  });

  it('shows the empty state and a zero count without URLs', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance.hasUrls).toBeFalse();
    expect(element.textContent).toContain('0 URLs');
    expect(element.querySelector('.no-data')?.textContent).toContain('No research URLs recorded');
  });

  it('renders one numbered external link per URL', () => {
    fixture.componentInstance.urls = ['https://a.test/x', 'https://b.test/y'];
    fixture.detectChanges();
    expect(element.textContent).toContain('2 URLs');
    const links = element.querySelectorAll<HTMLAnchorElement>('a.research-url');
    expect(links.length).toBe(2);
    expect(links[1].href).toBe('https://b.test/y');
    expect(links[1].rel).toBe('noopener noreferrer');
    expect(element.querySelector('.no-data')).toBeNull();
  });
});
