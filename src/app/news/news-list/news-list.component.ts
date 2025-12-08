// Copyright (c) 2025 Perpetuator LLC
import { Component, OnInit, OnDestroy, ViewChild, TemplateRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { DatePipe } from '@angular/common';
import { NgClass } from '@angular/common';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatList, MatListItem } from '@angular/material/list';
import { MatCard, MatCardContent, MatCardHeader } from '@angular/material/card';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatTooltip } from '@angular/material/tooltip';
import { MatDivider } from '@angular/material/divider';
import { MatOption, MatSelect } from '@angular/material/select';
import { toObservable } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';
import { MessageService } from '../../message.service';
import { ToolbarService } from '../../toolbar.service';
import { SvgIconComponent } from '../../svg-icon/svg-icon.component';
import { PodcastsResult, PodcastsService } from '../../podcast/podcasts.service';
import { Job, JobKind, JobService, JobStatus, stringToJobKind } from '../../jobs/job.service';
import { UserService } from '../../user/user.service';
import { EpisodeService } from '../../episode/episode.service';
import { JobDisplayService } from '../../job-display.service';
import { LoadingService } from '../../loading.service';
import { RecentlyUsedPodcastsService } from '../../podcast/recently-used-podcasts.service';
import { NewsConnection, NewsResult, NewsService } from '../news.service';

// export interface News {
//   results: NewsResult[];
// }

export interface SidePanelAccordianData {
  title: string;
  panelOpenState?: boolean;
}

@Component({
  selector: 'app-news',
  standalone: true,
  imports: [
    DatePipe,
    NgClass,
    MatFormField,
    MatLabel,
    MatIconModule,
    MatList,
    MatListItem,
    MatCard,
    MatCardHeader,
    MatCheckbox,
    MatCardContent,
    MatInput,

    MatButton,
    MatProgressSpinner,
    MatTooltip,
    MatDivider,
    MatSelect,
    MatOption,
    SvgIconComponent,
    MatProgressBarModule,
  ],
  templateUrl: './news-list.component.html',
  styleUrl: './news-list.component.scss',
})
export class NewsListComponent implements OnInit, OnDestroy {
  private subscriptions: Subscription = new Subscription();
  news: NewsConnection | null = null;
  filteredNews: NewsResult[] = [];
  selectedNews = new Set<NewsResult>();
  podcasts: PodcastsResult[] = [];
  selectedPodcastUuid: string | null = null;
  selectedRssFeedUuid: string | null = null;
  selectedHours = 24;
  filterTarget: HTMLInputElement | null = null;
  jobs: Job[] = [];
  selectedNewsDetail: NewsResult | null = null;
  newsFetched = false;
  loadingNews = false;
  totalNewsCount = 0;
  loadingPodcasts = true;
  rssFeeds: { uuid: string; name: string; url: string }[] = [];
  detailPanelWidth = 450; // Default width in pixels
  isResizing = false;
  private resizeStartX = 0;
  private resizeStartWidth = 0;

  // Local cache to track fetch timestamps for podcasts (prevents duplicate fetches before backend updates)
  private localFetchTimestamps = new Map<string, Date>();

  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;
  protected showMicroJobButtons = false;

  constructor(
    private newsService: NewsService,
    private messageService: MessageService,
    private toolbarService: ToolbarService,
    private podcastsService: PodcastsService,
    protected userService: UserService,
    private jobService: JobService,
    private episodeService: EpisodeService,
    private sanitizer: DomSanitizer,
    private jobDisplayService: JobDisplayService,
    private loadingService: LoadingService,
    private recentlyUsedPodcastsService: RecentlyUsedPodcastsService,
  ) {
    this.subscriptions.add(
      toObservable(this.jobService.jobs).subscribe({
        next: (jobs) => {
          this.jobService.getJobTransitions(jobs, this.jobs, JobStatus.COMPLETED).forEach((job) => {
            const jobKind = stringToJobKind(job.kind);
            // Refresh news list when news processing jobs complete (no message needed - job-status-bar handles it)
            if (
              [JobKind.FETCH_NEWS, JobKind.EXTRACT_NEWS, JobKind.SUMMARIZE_NEWS, JobKind.VALIDATE_NEWS].includes(
                jobKind,
              )
            ) {
              this.getNews();
            }
            // No need to show messages for episode/podcast creation - job-status-bar handles it globally
          });
          this.jobs = jobs;
        },
        error: (error) => {
          this.messageService.error(`Failed to load jobs signal: ${error.message}`);
        },
      }),
    );
  }

  ngOnInit(): void {
    const viewContainerRef = this.toolbarService.getViewContainerRef();
    viewContainerRef.clear();
    viewContainerRef.createEmbeddedView(this.toolbarTemplate);
    this.filteredNews = this.news?.edges.map((edge) => edge.node) || [];

    // Load podcast history first
    this.subscriptions.add(
      this.recentlyUsedPodcastsService.loadHistory().subscribe({
        next: () => {
          // Then load podcasts
          this.subscriptions.add(
            this.podcastsService.getPodcastsForFilter().subscribe({
              next: (response) => {
                this.podcasts = response.podcasts.filter((podcast) =>
                  podcast.team?.members.some((member) => member.role === 'publisher' || member.role === 'owner'),
                );

                // Sort by recently used
                this.podcasts = this.recentlyUsedPodcastsService.sortByRecentlyUsed(this.podcasts);

                // Auto-select default podcast
                this.selectedPodcastUuid = this.recentlyUsedPodcastsService.getDefaultSelection(this.podcasts);

                // Initialize RSS feeds for the auto-selected podcast and load existing news
                if (this.selectedPodcastUuid) {
                  this.onPodcastChange();
                  // Load existing news immediately on page load (no fetch job)
                  this.getNews();
                }

                this.loadingPodcasts = false;
              },
              error: (error) => {
                this.messageService.error(`Failed to get podcasts: ${error.message}`);
                this.loadingPodcasts = false;
              },
            }),
          );
        },
      }),
    );
  }

  fetchNews() {
    if (this.selectedPodcastUuid === null) {
      this.messageService.warning('No podcast selected.');
      return;
    }

    // Record fetch timestamp in local cache IMMEDIATELY to prevent duplicate triggers
    const fetchTime = new Date();
    this.localFetchTimestamps.set(this.selectedPodcastUuid, fetchTime);
    console.log(
      '[fetchNews] Recorded local timestamp for podcast:',
      this.selectedPodcastUuid,
      'at',
      fetchTime.toISOString(),
    );

    this.onPodcastSelect(this.selectedPodcastUuid);
    this.subscriptions.add(
      this.newsService.fetchNews(this.selectedPodcastUuid).subscribe({
        next: (data: { job: Job }) => {
          this.jobService.addJob(data.job);
          // Set newsFetched to true after fetch is initiated
          this.newsFetched = true;

          console.log('[fetchNews] News fetch job created successfully for podcast:', this.selectedPodcastUuid);
        },
        error: (error: Error) => {
          this.messageService.error(`Failed to fetch news: ${error.message}`);
          // Remove from local cache on error so retry is possible
          this.localFetchTimestamps.delete(this.selectedPodcastUuid!);
        },
      }),
    );
  }

  onPodcastChange() {
    this.news = null;
    this.filteredNews = [];
    this.selectedNews.clear();
    this.selectedNewsDetail = null;
    this.selectedRssFeedUuid = null;
    this.rssFeeds = [];

    if (this.selectedPodcastUuid !== null) {
      // Record this podcast selection for future sorting
      this.recentlyUsedPodcastsService.recordSelection(this.selectedPodcastUuid);

      // Load RSS feeds for the selected podcast
      const selectedPodcast = this.podcasts.find((p) => p.uuid === this.selectedPodcastUuid);
      if (selectedPodcast && selectedPodcast.rssFeeds && selectedPodcast.rssFeeds.length > 0) {
        this.rssFeeds = selectedPodcast.rssFeeds.map((feed) => ({
          uuid: feed.uuid,
          name: feed.name || feed.url,
          url: feed.url,
        }));
      } else {
        // No RSS feeds configured for this podcast
        console.warn('No RSS feeds configured for podcast:', selectedPodcast?.name);
      }

      // Always load existing news to show user latest cached data
      this.getNews();

      // Smart fetch: Only trigger fresh fetch if last fetch was >5 minutes ago
      if (selectedPodcast && this.shouldFetchNews(selectedPodcast)) {
        this.fetchNews();
      }
    }
  }

  /**
   * Determines if we should trigger a fresh news fetch based on last fetch time
   * @param podcast The selected podcast
   * @returns true if fetch is needed (>5 minutes since last fetch or never fetched)
   */
  private shouldFetchNews(podcast: PodcastsResult): boolean {
    // First check local cache (most recent, even if backend hasn't updated yet)
    const localTimestamp = this.localFetchTimestamps.get(podcast.uuid);
    if (localTimestamp) {
      const now = new Date();
      const minutesSinceLocalFetch = (now.getTime() - localTimestamp.getTime()) / (1000 * 60);

      console.log('[shouldFetchNews] Local cache check for:', podcast.name);
      console.log('[shouldFetchNews] Local last fetch:', localTimestamp.toISOString());
      console.log('[shouldFetchNews] Minutes since local fetch:', minutesSinceLocalFetch.toFixed(2));

      if (minutesSinceLocalFetch <= 5) {
        console.log('[shouldFetchNews] Using local cache - fetch blocked (within 5 min window)');
        return false;
      }
    }

    // Then check backend timestamp
    if (!podcast.lastNewsFetchedAt) {
      console.log('[shouldFetchNews] No lastNewsFetchedAt, will fetch');
      return true;
    }

    const lastFetchTime = new Date(podcast.lastNewsFetchedAt);
    const now = new Date();
    const minutesSinceLastFetch = (now.getTime() - lastFetchTime.getTime()) / (1000 * 60);

    console.log('[shouldFetchNews] Backend timestamp check for:', podcast.name);
    console.log('[shouldFetchNews] Backend last fetch:', lastFetchTime.toISOString());
    console.log('[shouldFetchNews] Now:', now.toISOString());
    console.log('[shouldFetchNews] Minutes since last fetch:', minutesSinceLastFetch.toFixed(2));
    console.log('[shouldFetchNews] Will fetch?', minutesSinceLastFetch > 5);

    // Fetch if >5 minutes have elapsed
    return minutesSinceLastFetch > 5;
  }

  onRssFeedChange() {
    // Reload news with the selected RSS feed filter
    if (this.selectedPodcastUuid !== null) {
      this.getNews();
    }
  }

  extractSelectedNews() {
    if (this.selectedNews.size === 0) {
      this.messageService.warning('No news items selected.');
      return;
    }
    this.messageService.info('Extracting content from selected news items (this may take a while)...');

    const newsUuids = [...this.selectedNews].map((entry) => entry.uuid);
    this.extractNews(newsUuids);
  }

  extractNews(newsUuids: string[]) {
    if (this.selectedPodcastUuid === null) {
      this.messageService.warning('No podcast selected.');
      return;
    }
    this.subscriptions.add(
      this.newsService.extractNews(this.selectedPodcastUuid, newsUuids).subscribe({
        next: (data: { job: Job }) => {
          this.jobService.addJob(data.job);
        },
        error: (error: Error) => {
          this.messageService.error(`Failed to extract news: ${error.message}`);
        },
      }),
    );
  }

  summarizeSelected() {
    if (this.selectedNews.size === 0) {
      this.messageService.warning('No news items selected.');
      return;
    }
    if (this.selectedPodcastUuid === null) {
      this.messageService.warning('No podcast selected.');
      return;
    }
    this.messageService.info('Summarizing content of selected news items (this may take a while)...');
    const newsUuids = [...this.selectedNews].map((entry) => entry.uuid);
    this.summarizeNews(this.selectedPodcastUuid, newsUuids);
  }

  regenerateSummary(uuid: string) {
    if (this.selectedPodcastUuid === null) {
      this.messageService.warning('No podcast selected.');
      return;
    }
    this.messageService.info('Regenerating summary for news item (this may take a while)...');
    this.summarizeNews(this.selectedPodcastUuid, [uuid], true);
  }

  processNews(uuid: string) {
    if (this.selectedPodcastUuid === null) {
      this.messageService.warning('No podcast selected.');
      return;
    }
    this.messageService.info('Processing news item (this may take a while)...');
    this.subscriptions.add(
      this.newsService.processNewsChain(this.selectedPodcastUuid, [uuid]).subscribe({
        next: (data: { jobs: Job[] }) => {
          this.jobService.addJobs(data.jobs);
        },
        error: (error: Error) => {
          this.messageService.error(`Failed to process news: ${error.message}`);
        },
      }),
    );
  }

  private summarizeNews(podcastUuid: string, newsUuids: string[], force = false) {
    this.subscriptions.add(
      this.newsService.summarizeNews(podcastUuid, newsUuids, force).subscribe({
        next: (data: { job: Job }) => {
          this.jobService.addJob(data.job);
        },
        error: (error: Error) => {
          this.messageService.error(`Failed to summarize news data: ${error.message}`);
        },
      }),
    );
  }

  onPodcastSelect(podcastUuid: string | null) {
    if (!podcastUuid) {
      this.messageService.warning('No podcast selected.');
      return;
    }
    // Record selection in history
    this.recentlyUsedPodcastsService.recordSelection(podcastUuid);
    // Get news with the selected podcast
    this.getNews();
  }

  createBlankEpisode() {
    if (this.selectedPodcastUuid === null) {
      this.messageService.warning('No podcast selected.');
      return;
    }

    const newsUuids: string[] = [];
    this.subscriptions.add(
      this.newsService.createEpisode(newsUuids, this.selectedPodcastUuid).subscribe({
        next: (data: { job: Job }) => {
          this.messageService.info('Creating blank episode...');
          this.jobService.addJob(data.job);
        },
        error: (err: Error) => {
          this.messageService.error(err.message);
        },
      }),
    );
  }

  createEpisodeChainFromSelected() {
    if (this.selectedNews.size === 0) {
      this.messageService.warning('No news items selected.');
      return;
    }
    if (this.selectedPodcastUuid === null) {
      this.messageService.warning('No podcast selected.');
      return;
    }
    this.messageService.info('Creating episode from selected news items (this may take a while)...');

    const newsUuids = [...this.selectedNews].map((entry) => entry.uuid);
    this.subscriptions.add(
      this.newsService.createEpisodeChain(newsUuids, this.selectedPodcastUuid).subscribe({
        next: (data: { jobs: Job[] }) => {
          this.jobService.addJobs(data.jobs);
        },
        error: (err: Error) => {
          this.messageService.error(err.message);
        },
      }),
    );
  }

  createEpisodeAudioChainFromSelected() {
    if (this.selectedNews.size === 0) {
      this.messageService.warning('No news items selected.');
      return;
    }
    if (this.selectedPodcastUuid === null) {
      this.messageService.warning('No podcast selected.');
      return;
    }
    this.messageService.info('Creating audio from selected news items (this may take a while)...');

    const newsUuids = [...this.selectedNews].map((entry) => entry.uuid);
    this.subscriptions.add(
      this.newsService.createEpisodeAudioChain(newsUuids, this.selectedPodcastUuid).subscribe({
        next: (data: { jobs: Job[] }) => {
          this.jobService.addJobs(data.jobs);
        },
        error: (err: Error) => {
          this.messageService.error(err.message);
        },
      }),
    );
  }

  createEpisodeFromSelected() {
    if (this.selectedNews.size === 0) {
      this.messageService.warning('No news items selected.');
      return;
    }
    if (this.selectedPodcastUuid === null) {
      this.messageService.warning('No podcast selected.');
      return;
    }

    const newsUuids = [...this.selectedNews].map((entry) => entry.uuid);
    this.subscriptions.add(
      this.newsService.createEpisode(newsUuids, this.selectedPodcastUuid).subscribe({
        next: (data: { job: Job }) => {
          this.messageService.info('Creating episode from selected news items (this may take a while)...');
          this.jobService.addJob(data.job);
        },
        error: (err: Error) => {
          this.messageService.error(err.message);
        },
      }),
    );
  }

  // generateBlankEpisode() {
  //   if (!this.selectedPodcastUuid) return;
  //   this.newsService.createEpisode([], this.selectedPodcastUuid).subscribe({
  //     next: () => {
  //       this.messageService.success('Blank episode created successfully.');
  //     },
  //     error: (err) => {
  //       this.messageService.error('Failed to create blank episode.');
  //       console.error(err);
  //     },
  //   });
  // }

  getNews() {
    if (this.selectedPodcastUuid === null) {
      this.messageService.warning('No podcast selected.');
      return;
    }
    const selectedNewsIds = this.getSelectedNewsIds();
    this.loadingNews = true;
    this.loadingService.show();
    this.totalNewsCount = 0;

    this.loadAllNewsPages(this.selectedPodcastUuid, this.selectedHours, selectedNewsIds);
  }

  private loadAllNewsPages(
    podcastUuid: string,
    hours: number,
    selectedNewsIds: string[],
    after: string | null = null,
    accumulatedEdges: { cursor: string; node: NewsResult }[] = [],
  ) {
    this.subscriptions.add(
      this.newsService.news(podcastUuid, hours, 100, after, this.selectedRssFeedUuid).subscribe({
        next: (data: NewsConnection) => {
          const allEdges = [...accumulatedEdges, ...data.edges];
          this.totalNewsCount = allEdges.length;

          if (data.pageInfo.hasNextPage && data.pageInfo.endCursor) {
            this.loadAllNewsPages(podcastUuid, hours, selectedNewsIds, data.pageInfo.endCursor, allEdges);
          } else {
            this.news = {
              edges: allEdges,
              pageInfo: data.pageInfo,
            };
            this.filteredNews = this.news.edges.map((edge) => edge.node);
            this.reapplySelection(selectedNewsIds);
            this.applyFilter(null);
            this.newsFetched = true;
            this.loadingNews = false;
            this.loadingService.hide();
          }
        },
        error: (err: { message: string }) => {
          this.messageService.error(`Failed to get news data: ${err.message}`);
          this.loadingNews = false;
          this.loadingService.hide();
        },
      }),
    );
  }

  private getSelectedNewsIds(): string[] {
    return [...this.selectedNews].map((entry) => entry.uuid);
  }

  private reapplySelection(selectedNewsUuids: string[]): void {
    this.selectedNews.clear();
    this.filteredNews.forEach((news) => {
      if (selectedNewsUuids.includes(news.uuid)) {
        this.selectedNews.add(news);
      }
    });
  }

  applyFilter(target: EventTarget | null) {
    this.filterTarget = target === null ? this.filterTarget : (target as HTMLInputElement);
    const filterValue = this.filterTarget?.value;

    if (!filterValue) {
      this.filteredNews = this.news?.edges.map((edge) => edge.node) || [];
      return;
    }

    // Rest of the method remains the same but using the new data structure
    let lowerCaseFilter = filterValue.toLowerCase();
    let isNegated = false;

    if (lowerCaseFilter.startsWith('-')) {
      isNegated = true;
      lowerCaseFilter = lowerCaseFilter.substring(1);
      lowerCaseFilter = lowerCaseFilter.trim();
    }

    const allNews = this.news?.edges.map((edge) => edge.node) || [];

    if (isNegated) {
      this.filteredNews = allNews.filter(
        (news: NewsResult) =>
          !(
            news.title.toLowerCase().includes(lowerCaseFilter) ||
            news.description.toLowerCase().includes(lowerCaseFilter) ||
            news.summary.toLowerCase().includes(lowerCaseFilter) ||
            news.source.toLowerCase().includes(lowerCaseFilter)
          ),
      );
    } else {
      this.filteredNews = allNews.filter(
        (news: NewsResult) =>
          news.title.toLowerCase().includes(lowerCaseFilter) ||
          news.description.toLowerCase().includes(lowerCaseFilter) ||
          news.summary.toLowerCase().includes(lowerCaseFilter) ||
          news.source.toLowerCase().includes(lowerCaseFilter),
      );
    }
  }

  selectAll() {
    this.selectedNews = new Set(this.filteredNews);
  }

  unselectAll() {
    this.selectedNews.clear();
  }

  toggleSelectAll() {
    if (this.selectedNews.size === this.filteredNews.length && this.filteredNews.length > 0) {
      this.unselectAll();
    } else {
      this.selectAll();
    }
  }

  toggleSelection(news: NewsResult) {
    if (this.selectedNews.has(news)) {
      this.selectedNews.delete(news);
    } else {
      this.selectedNews.add(news);
    }
  }

  isSelected(news: NewsResult): boolean {
    return this.selectedNews.has(news);
  }

  selectNews(news: NewsResult) {
    this.selectedNewsDetail = news;
    // Ensure detail panel width doesn't exceed constraints
    const maxWidth = window.innerWidth * 0.8;
    if (this.detailPanelWidth > maxWidth) {
      this.detailPanelWidth = Math.min(450, maxWidth);
    }
  }

  clearSelectedNewsDetail() {
    this.selectedNewsDetail = null;
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.toolbarService.clearToolbarComponent();
    this.loadingService.hide();
    // Clean up resize event listeners
    document.removeEventListener('mousemove', this.onResizeMove);
    document.removeEventListener('mouseup', this.onResizeEnd);
  }

  // Method to convert markdown to safe HTML
  markdownToHtml(markdown: string): SafeHtml {
    const html = marked.parse(markdown, { async: false }) as string;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  // Get tag value by kind
  getTagValue(news: NewsResult, kind: string): string | null {
    const tag = news.tags?.find((t) => t.kind === kind);
    return tag?.value ?? null;
  }

  // Get formatted tag label
  getTagLabel(kind: string, value: string): string {
    const labels: Record<string, Record<string, string>> = {
      political: {
        democratic: 'Democratic',
        republican: 'Republican',
        neutral: 'Neutral',
      },
      financial_sentiment: {
        bullish: '📈 Bullish',
        bearish: '📉 Bearish',
        neutral: '➡️ Neutral',
      },
      tone: {
        urgent: 'Urgent',
        calm: 'Calm',
        analytical: 'Analytical',
        sensational: 'Sensational',
      },
      content_type: {
        analysis: 'Analysis',
        breaking: 'Breaking',
        opinion: 'Opinion',
        data: 'Data Report',
      },
    };

    return labels[kind]?.[value] || value;
  }

  // Get CSS class for tag kind
  getTagClass(kind: string, value: string): string {
    const classes: Record<string, Record<string, string>> = {
      political: {
        democratic: 'tag-political-democratic',
        republican: 'tag-political-republican',
        neutral: 'tag-political-neutral',
      },
      financial_sentiment: {
        bullish: 'tag-sentiment-bullish',
        bearish: 'tag-sentiment-bearish',
        neutral: 'tag-sentiment-neutral',
      },
      tone: {
        urgent: 'tag-tone-urgent',
        calm: 'tag-tone-calm',
        analytical: 'tag-tone-analytical',
        sensational: 'tag-tone-sensational',
      },
      content_type: {
        analysis: 'tag-content-analysis',
        breaking: 'tag-content-breaking',
        opinion: 'tag-content-opinion',
        data: 'tag-content-data',
      },
    };

    return classes[kind]?.[value] || 'tag-default';
  }

  // Resize handle methods
  onResizeStart(event: MouseEvent): void {
    this.isResizing = true;
    this.resizeStartX = event.clientX;
    this.resizeStartWidth = this.detailPanelWidth;
    event.preventDefault();

    // Add event listeners to document for smooth dragging
    document.addEventListener('mousemove', this.onResizeMove);
    document.addEventListener('mouseup', this.onResizeEnd);
  }

  private onResizeMove = (event: MouseEvent): void => {
    if (!this.isResizing) return;

    // Calculate the new width (subtract because we're dragging from the left edge)
    const deltaX = this.resizeStartX - event.clientX;
    let newWidth = this.resizeStartWidth + deltaX;

    // Constrain width between min and max
    const minWidth = 300;
    const maxWidth = window.innerWidth * 0.8; // Max 80% of viewport
    newWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));

    this.detailPanelWidth = newWidth;
  };

  private onResizeEnd = (): void => {
    this.isResizing = false;
    document.removeEventListener('mousemove', this.onResizeMove);
    document.removeEventListener('mouseup', this.onResizeEnd);
  };
}
