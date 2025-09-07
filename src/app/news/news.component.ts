// Copyright (c) 2025 Perpetuator LLC
import { Component, OnInit, OnDestroy, ViewChild, TemplateRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { NewsConnection, NewsService, NewsResult } from '../news.service';
import { DatePipe } from '@angular/common';
import { NgIf } from '@angular/common';
import { NgClass } from '@angular/common';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatList, MatListItem } from '@angular/material/list';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatInput } from '@angular/material/input';
import { MessageService } from '../message.service';
import { MessageComponent } from '../message/message.component';
import { ToolbarService } from '../toolbar.service';
import { MatButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatExpansionPanel, MatExpansionPanelHeader, MatExpansionPanelTitle } from '@angular/material/expansion';
import { MatTooltip } from '@angular/material/tooltip';
import { MatDivider } from '@angular/material/divider';
import { PodcastsResult, PodcastsService } from '../podcasts.service';
import { MatOption, MatSelect } from '@angular/material/select';
import { UserService } from '../user.service';
import { JobStatusBarComponent } from '../job-status-bar/job-status-bar.component';
import { EpisodeService } from '../episode.service';
import { Job, JobService, JobStatus, JobKind, stringToJobKind } from '../job.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { SvgIconComponent } from '../svg-icon/svg-icon.component';
import { MatProgressBarModule } from '@angular/material/progress-bar';

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
    NgIf,
    NgClass,
    MatFormField,
    MatLabel,
    MatIconModule,
    MatList,
    MatListItem,
    MatCard,
    MatCardTitle,
    MatCardHeader,
    MatCheckbox,
    MatCardContent,
    MatInput,
    MessageComponent,
    MatButton,
    MatProgressSpinner,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    MatTooltip,
    MatDivider,
    MatSelect,
    MatOption,
    JobStatusBarComponent,
    SvgIconComponent,
    MatProgressBarModule,
  ],
  templateUrl: './news.component.html',
  styleUrl: './news.component.scss',
})
export class NewsComponent implements OnInit, OnDestroy {
  private subscriptions: Subscription = new Subscription();
  news: NewsConnection | null = null;
  filteredNews: NewsResult[] = [];
  selectedNews = new Set<NewsResult>();
  podcasts: PodcastsResult[] = [];
  selectedPodcastUuid: string | null = null;
  selectedHours = 24;
  filterTarget: HTMLInputElement | null = null;
  jobs: Job[] = [];
  private podcastHistoryKey = 'news-podcast-history';
  private podcastHistory: string[] = [];
  selectedNewsDetail: NewsResult | null = null;
  newsFetched = false;

  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;
  @ViewChild(JobStatusBarComponent) jobStatusBar!: JobStatusBarComponent;
  protected showMicroJobButtons = false;

  constructor(
    private newsService: NewsService,
    private messageService: MessageService,
    private toolbarService: ToolbarService,
    private podcastsService: PodcastsService,
    protected userService: UserService,
    private jobService: JobService,
    private episodeService: EpisodeService,
  ) {
    this.subscriptions.add(
      toObservable(this.jobService.jobs).subscribe({
        next: (jobs) => {
          this.jobService.getJobTransitions(jobs, this.jobs, JobStatus.COMPLETED).forEach((job) => {
            if (
              [JobKind.FETCH_NEWS, JobKind.EXTRACT_NEWS, JobKind.SUMMARIZE_NEWS].includes(stringToJobKind(job.kind))
            ) {
              this.getNews();
            } else if ([JobKind.CREATE_EPISODE].includes(stringToJobKind(job.kind))) {
              this.subscriptions.add(
                this.episodeService.getEpisodeById(job.result).subscribe({
                  next: (episode) => {
                    const newEpisodeUrl = `/episode/${job.result}`;
                    this.messageService.success(
                      `New episode: <a href="${newEpisodeUrl}">${episode.title === '' ? '(Blank)' : episode.title}</a>`,
                      null,
                      true,
                    );
                  },
                  error: (error) => {
                    this.messageService.error(`Failed to get new episode: ${error.message}`);
                  },
                }),
              );
            }
          });
          // const failedJobs = this.jobService.getJobTransitions(jobs, this.jobs, JobStatus.FAILED);
          // if (failedJobs.length > 0) {
          //   this.showMicroJobButtons = true;
          // }
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

    this.subscriptions.add(
      this.podcastsService.getPodcasts().subscribe({
        next: (response) => {
          this.podcasts = response.podcasts.filter((podcast) =>
            podcast.team?.members.some((member) => member.role === 'publisher' || member.role === 'owner'),
          );
          this.sortPodcastsByHistory();

          if (this.podcasts.length > 0) {
            const lastSelected = this.podcastHistory[0];
            if (lastSelected && this.podcasts.some((p) => p.uuid === lastSelected)) {
              this.selectedPodcastUuid = lastSelected;
            } else {
              this.selectedPodcastUuid = this.podcasts[0].uuid;
            }
          }
        },
        error: (error) => {
          this.messageService.error(`Failed to get podcasts: ${error.message}`);
        },
      }),
    );

    this.loadPodcastHistory();
  }

  fetchNews() {
    if (this.selectedPodcastUuid === null) {
      this.messageService.warning('No podcast selected.');
      return;
    }
    this.onPodcastSelect(this.selectedPodcastUuid);
    this.subscriptions.add(
      this.newsService.fetchNews(this.selectedPodcastUuid).subscribe({
        next: (data) => {
          if (!data.job) {
            this.messageService.error('Failed to fetch news, no job returned');
            return;
          }
          this.jobService.addJob(data.job);
          // Set newsFetched to true after fetch is initiated
          this.newsFetched = true;
        },
        error: (error) => {
          this.messageService.error(`Failed to fetch news: ${error.message}`);
        },
      }),
    );
  }

  onPodcastChange() {
    this.news = null;
    this.filteredNews = [];
    this.selectedNews.clear();
    this.selectedNewsDetail = null;

    if (this.newsFetched && this.selectedPodcastUuid !== null) {
      this.onPodcastSelect(this.selectedPodcastUuid);
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
        next: (data) => {
          if (!data.job) {
            this.messageService.error('Failed to extract news: No job returned');
            return;
          }
          this.jobService.addJob(data.job);
        },
        error: (error) => {
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

  private summarizeNews(podcastUuid: string, newsUuids: string[], force = false) {
    this.subscriptions.add(
      this.newsService.summarizeNews(podcastUuid, newsUuids, force).subscribe({
        next: (data) => {
          if (!data.job) {
            this.messageService.error('Failed to summarize news data: No job returned');
            return;
          }
          this.jobService.addJob(data.job);
        },
        error: (error) => {
          this.messageService.error(`Failed to summarize news data: ${error.message}`);
        },
      }),
    );
  }

  // Add this method to handle podcast selection
  onPodcastSelect(podcastUuid: string | null) {
    if (!podcastUuid) {
      this.messageService.warning('No podcast selected.');
      return;
    }
    // this.onPodcastChange();
    // Update selection history
    this.updatePodcastHistory(podcastUuid);
    // Get news with the selected podcast
    this.getNews();
  }

  // Method to load podcast history
  private loadPodcastHistory() {
    this.userService.userSettings([this.podcastHistoryKey]).subscribe({
      next: (settings) => {
        const historySetting = settings.find((setting) => setting.key === this.podcastHistoryKey);
        if (historySetting) {
          try {
            this.podcastHistory = JSON.parse(historySetting.value);
            // Sort podcasts based on history when they're loaded
            this.sortPodcastsByHistory();
          } catch (e) {
            console.error('Error parsing podcast history', e);
            this.podcastHistory = [];
          }
        }
      },
      error: (err) => {
        console.error('Error loading podcast history', err);
      },
    });
  }

  // Method to update podcast history
  private updatePodcastHistory(podcastUuid: string) {
    // Remove the selected podcast if it's already in history
    this.podcastHistory = this.podcastHistory.filter((uuid) => uuid !== podcastUuid);
    // Add it to the beginning (most recent)
    this.podcastHistory.unshift(podcastUuid);

    // Save the updated history
    this.userService.updateUserSetting(this.podcastHistoryKey, JSON.stringify(this.podcastHistory)).subscribe({
      error: (err) => console.error('Error saving podcast history', err),
    });
  }

  // Method to sort podcasts based on history
  private sortPodcastsByHistory() {
    if (!this.podcasts || this.podcasts.length === 0 || this.podcastHistory.length === 0) {
      return;
    }

    // Create a map for quick lookup of podcast index in history
    const historyMap: Record<string, number> = {};
    this.podcastHistory.forEach((uuid, index) => {
      historyMap[uuid] = index;
    });

    // Sort podcasts: recently selected first, then others
    this.podcasts.sort((a, b) => {
      const indexA = historyMap[a.uuid] !== undefined ? historyMap[a.uuid] : Number.MAX_SAFE_INTEGER;
      const indexB = historyMap[b.uuid] !== undefined ? historyMap[b.uuid] : Number.MAX_SAFE_INTEGER;
      return indexA - indexB;
    });
  }

  createBlankEpisode() {
    if (this.selectedPodcastUuid === null) {
      this.messageService.warning('No podcast selected.');
      return;
    }

    const newsUuids: string[] = [];
    this.subscriptions.add(
      this.newsService.createEpisode(newsUuids, this.selectedPodcastUuid).subscribe({
        next: (data) => {
          if (!data.job) {
            this.messageService.error('Failed to create episode: No job returned');
            return;
          }
          this.messageService.info('Creating blank episode...');
          this.jobService.addJob(data.job);
        },
        error: (err: { message: string }) => {
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
        next: (data) => {
          if (!data.jobs) {
            this.messageService.error('Failed to create episode: No jobs returned');
            return;
          }
          this.jobService.addJobs(data.jobs);
        },
        error: (err) => {
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
        next: (data) => {
          if (!data.jobs) {
            this.messageService.error('Failed to create audio: No jobs returned');
            return;
          }
          this.jobService.addJobs(data.jobs);
        },
        error: (err) => {
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
        next: (data) => {
          if (!data.job) {
            this.messageService.error('Failed to create episode: No job returned');
            return;
          }
          this.messageService.info('Creating episode from selected news items (this may take a while)...');
          this.jobService.addJob(data.job);
        },
        error: (err: { message: string }) => {
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
    this.subscriptions.add(
      this.newsService.news(this.selectedPodcastUuid, this.selectedHours).subscribe({
        next: (data: NewsConnection) => {
          this.news = data;
          this.filteredNews = this.news?.edges.map((edge) => edge.node) || [];
          this.reapplySelection(selectedNewsIds);
          this.applyFilter(null);
          // Set newsFetched to true after news is loaded
          this.newsFetched = true;
        },
        error: (err: { message: string }) => {
          this.messageService.error(`Failed to get news data: ${err.message}`);
        },
        complete: () => {
          console.debug('News data fetch complete');
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
  }

  clearSelectedNewsDetail() {
    this.selectedNewsDetail = null;
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.toolbarService.clearToolbarComponent();
  }
}
