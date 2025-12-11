// Copyright (c) 2025 Perpetuator LLC
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { NewsListComponent } from './news-list.component';
import { provideMockApollo, provideMockOAuthService, provideMockToolbarService } from '../../testing/test-providers';
import { PodcastsResult, PodcastsService } from '../../podcast/podcasts.service';
import { RecentlyUsedPodcastsService } from '../../podcast/recently-used-podcasts.service';
import { Job } from '../../jobs/job.service';
import { NewsService } from '../news.service';

describe('NewsComponent', () => {
  let component: NewsListComponent;
  let fixture: ComponentFixture<NewsListComponent>;
  let mockPodcastsService: jasmine.SpyObj<PodcastsService>;
  let mockRecentlyUsedPodcastsService: jasmine.SpyObj<RecentlyUsedPodcastsService>;
  let mockNewsService: jasmine.SpyObj<NewsService>;

  const mockJob: Job = {
    id: 'test-job-id',
    uuid: 'test-job-uuid',
    kind: 'FETCH_NEWS',
    status: 'PENDING',
    error: '',
    result: null,
    args: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Partial mock data - only include fields needed for filtering logic
  const mockPodcastsResponse = {
    podcasts: [
      {
        id: '1',
        uuid: 'podcast-1',
        name: 'Test Podcast 1',
        enabled: true,
        team: {
          id: '1',
          uuid: 'team-1',
          name: 'Test Team',
          podcasts: [],
          members: [{ role: 'owner', username: 'testuser' }],
        },
      },
      {
        id: '2',
        uuid: 'podcast-2',
        name: 'Test Podcast 2',
        enabled: true,
        team: {
          id: '1',
          uuid: 'team-1',
          name: 'Test Team',
          podcasts: [],
          members: [{ role: 'publisher', username: 'testuser' }],
        },
      },
    ] as unknown as PodcastsResult[],
  };

  beforeEach(async () => {
    mockPodcastsService = jasmine.createSpyObj('PodcastsService', ['getPodcastsForFilter']);
    mockPodcastsService.getPodcastsForFilter.and.returnValue(of(mockPodcastsResponse));

    mockRecentlyUsedPodcastsService = jasmine.createSpyObj('RecentlyUsedPodcastsService', [
      'loadHistory',
      'sortByRecentlyUsed',
      'getDefaultSelection',
      'recordSelection',
    ]);
    mockRecentlyUsedPodcastsService.loadHistory.and.returnValue(of([]));
    mockRecentlyUsedPodcastsService.sortByRecentlyUsed.and.callFake((podcasts: PodcastsResult[]) => podcasts);
    mockRecentlyUsedPodcastsService.getDefaultSelection.and.returnValue('podcast-1');
    mockRecentlyUsedPodcastsService.recordSelection.and.returnValue(undefined);

    mockNewsService = jasmine.createSpyObj('NewsService', ['fetchNews', 'news']);
    mockNewsService.fetchNews.and.returnValue(of({ job: mockJob }));
    mockNewsService.news.and.returnValue(
      of({
        edges: [],
        pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null },
      }),
    );

    await TestBed.configureTestingModule({
      imports: [NewsListComponent, HttpClientTestingModule, NoopAnimationsModule],
      providers: [
        provideMockApollo(),
        provideMockOAuthService(),
        provideMockToolbarService(),
        { provide: PodcastsService, useValue: mockPodcastsService },
        { provide: RecentlyUsedPodcastsService, useValue: mockRecentlyUsedPodcastsService },
        { provide: NewsService, useValue: mockNewsService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NewsListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Podcast dropdown population', () => {
    it('should populate podcasts dropdown on initialization', fakeAsync(() => {
      // Act
      fixture.detectChanges();
      tick();

      // Assert
      expect(mockRecentlyUsedPodcastsService.loadHistory).toHaveBeenCalled();
      expect(mockPodcastsService.getPodcastsForFilter).toHaveBeenCalled();
      expect(component.podcasts.length).toBeGreaterThan(0);
      expect(component.podcasts.length).toBe(2);
    }));

    it('should auto-select a podcast when podcasts are loaded', fakeAsync(() => {
      // Act
      fixture.detectChanges();
      tick();

      // Assert
      expect(component.selectedPodcastUuid).toBe('podcast-1');
    }));

    it('should filter podcasts to only show those where user is owner or publisher', fakeAsync(() => {
      // Arrange - add a podcast where user has no publish rights
      const responseWithNonPublisher = {
        podcasts: [
          ...mockPodcastsResponse.podcasts,
          {
            id: '3',
            uuid: 'podcast-3',
            name: 'Test Podcast 3 - No Access',
            enabled: true,
            team: {
              id: '2',
              uuid: 'team-2',
              name: 'Other Team',
              podcasts: [],
              members: [{ role: 'viewer', username: 'testuser' }],
            },
          } as unknown as PodcastsResult,
        ],
      };
      mockPodcastsService.getPodcastsForFilter.and.returnValue(of(responseWithNonPublisher));

      // Act
      fixture.detectChanges();
      tick();

      // Assert - should only have 2 podcasts (not the viewer-only one)
      expect(component.podcasts.length).toBe(2);
      expect(component.podcasts.find((p) => p.uuid === 'podcast-3')).toBeUndefined();
    }));
  });
});
