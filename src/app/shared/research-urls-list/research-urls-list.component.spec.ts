// Copyright (c) 2026 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResearchUrlsListComponent } from './research-urls-list.component';

describe('ResearchUrlsListComponent', () => {
  let fixture: ComponentFixture<ResearchUrlsListComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResearchUrlsListComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ResearchUrlsListComponent);
    element = fixture.nativeElement as HTMLElement;
  });

  it('shows the empty state when no URLs are given', () => {
    fixture.detectChanges();
    expect(element.querySelector('.no-data')?.textContent).toContain('No research URLs recorded');
    expect(element.querySelectorAll('.url-item').length).toBe(0);
  });

  it('renders a numbered link per URL with a count in the header', () => {
    fixture.componentInstance.urls = ['https://a.test/one', 'https://b.test/two'];
    fixture.detectChanges();
    const links = element.querySelectorAll<HTMLAnchorElement>('a.url-link');
    expect(links.length).toBe(2);
    expect(links[0].href).toBe('https://a.test/one');
    expect(links[0].rel).toBe('noopener noreferrer');
    expect(element.querySelector('.count')?.textContent).toContain('2 URLs');
    expect(element.querySelectorAll('.url-number')[1].textContent).toContain('2');
  });

  it('hides the header when showHeader is false', () => {
    fixture.componentInstance.showHeader = false;
    fixture.detectChanges();
    expect(element.querySelector('.urls-header')).toBeNull();
  });
});
