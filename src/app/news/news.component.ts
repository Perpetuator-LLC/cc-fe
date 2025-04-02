// Copyright (c) 2025 Perpetuator LLC
import { Component, OnInit, OnDestroy, ViewChild, TemplateRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { NewsService } from '../news.service';
import { DatePipe } from '@angular/common';
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
import { PodcastsService } from '../podcasts.service';
import { PodcastsResult } from '../podcasts-list/podcasts-list.component';
import { MatOption, MatSelect } from '@angular/material/select';
import { UserService } from '../user.service';
import { JobStatusBarComponent } from '../job-status-bar/job-status-bar.component';
import { EpisodeService } from '../episode.service';
import { Job, JobService, JobStatus, JobType, stringToJobType } from '../job.service';
import { toObservable } from '@angular/core/rxjs-interop';

export interface NewsResult {
  id: string;
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: string;
  content: string;
  summary: string;
}

export interface News {
  results: NewsResult[];
}

export interface SidePanelAccordianData {
  title: string;
  panelOpenState?: boolean;
}

@Component({
  selector: 'app-news',
  standalone: true,
  imports: [
    DatePipe,
    MatFormField,
    MatLabel,
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
  ],
  templateUrl: './news.component.html',
  styleUrl: './news.component.scss',
})
export class NewsComponent implements OnInit, OnDestroy {
  private subscriptions: Subscription = new Subscription();
  news: News | null = null;
  filteredNews: NewsResult[] = [];
  selectedNews = new Set<NewsResult>();
  podcasts: PodcastsResult[] = [];
  selectedPodcastId: number | null = null;
  selectedHours = 24;
  filterTarget: HTMLInputElement | null = null;
  jobs: Job[] = [];

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
              [JobType.FETCH_NEWS, JobType.EXTRACT_NEWS, JobType.SUMMARIZE_NEWS].includes(stringToJobType(job.jobType))
            ) {
              this.getNews();
            } else if ([JobType.CREATE_ARTICLE].includes(stringToJobType(job.jobType))) {
              this.subscriptions.add(
                this.episodeService.episodeById(job.result).subscribe({
                  next: (episode) => {
                    const newEpisodeUrl = `/episode/${job.result}`;
                    this.messageService.success(
                      `New episode: <a href="${newEpisodeUrl}">${episode.title}</a>`,
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
    this.filteredNews = this.news?.results || [];

    this.subscriptions.add(
      this.podcastsService.getPodcasts().subscribe({
        next: (podcasts) => {
          this.podcasts = podcasts.filter((podcast) =>
            podcast.team.members.some((member) => member.role === 'publisher' || member.role === 'owner'),
          );
        },
        error: (error) => {
          this.messageService.error(`Failed to get podcasts: ${error.message}`);
        },
      }),
    );
  }

  fetchNews() {
    if (this.selectedPodcastId === null) {
      this.messageService.warning('No podcast selected.');
      return;
    }
    this.subscriptions.add(
      this.newsService.fetchNews(this.selectedPodcastId).subscribe({
        next: (data) => {
          if (!data.job) {
            this.messageService.error('Failed to fetch news, no job returned');
            return;
          }
          this.jobService.addJob(data.job);
        },
        error: (error) => {
          this.messageService.error(`Failed to fetch news: ${error.message}`);
        },
      }),
    );
  }

  extractSelectedNews() {
    if (this.selectedNews.size === 0) {
      this.messageService.warning('No news items selected.');
      return;
    }
    if (this.selectedPodcastId === null) {
      this.messageService.warning('No podcast selected.');
      return;
    }
    this.messageService.info('Extracting content from selected news items (this may take a while)...');

    const newsIds = [...this.selectedNews].map((entry) => Number(entry.id));
    this.subscriptions.add(
      this.newsService.extractNews(this.selectedPodcastId, newsIds).subscribe({
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
    if (this.selectedPodcastId === null) {
      this.messageService.warning('No podcast selected.');
      return;
    }
    this.messageService.info('Summarizing content of selected news items (this may take a while)...');
    const newsIds = [...this.selectedNews].map((entry) => Number(entry.id));
    this.summarizeNews(this.selectedPodcastId, newsIds);
  }

  regenerateSummary(id: string) {
    if (this.selectedPodcastId === null) {
      this.messageService.warning('No podcast selected.');
      return;
    }
    this.messageService.info('Regenerating summary for news item (this may take a while)...');
    this.summarizeNews(this.selectedPodcastId, [Number(id)], true);
  }

  private summarizeNews(podcastId: number, newsIds: number[], force = false) {
    this.subscriptions.add(
      this.newsService.summarizeNews(podcastId, newsIds, force).subscribe({
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

  createEpisodeChainFromSelected() {
    if (this.selectedNews.size === 0) {
      this.messageService.warning('No news items selected.');
      return;
    }
    if (this.selectedPodcastId === null) {
      this.messageService.warning('No podcast selected.');
      return;
    }
    this.messageService.info('Creating episode from selected news items (this may take a while)...');

    const newsIds = [...this.selectedNews].map((entry) => Number(entry.id));
    this.subscriptions.add(
      this.newsService.createEpisodeChain(newsIds, this.selectedPodcastId).subscribe({
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
    if (this.selectedPodcastId === null) {
      this.messageService.warning('No podcast selected.');
      return;
    }
    this.messageService.info('Creating audio from selected news items (this may take a while)...');

    const newsIds = [...this.selectedNews].map((entry) => Number(entry.id));
    this.subscriptions.add(
      this.newsService.createEpisodeAudioChain(newsIds, this.selectedPodcastId).subscribe({
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
    if (this.selectedPodcastId === null) {
      this.messageService.warning('No podcast selected.');
      return;
    }

    const newsIds = [...this.selectedNews].map((entry) => Number(entry.id));
    this.subscriptions.add(
      this.newsService.createEpisode(newsIds, this.selectedPodcastId).subscribe({
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

  getNews() {
    if (this.selectedPodcastId === null) {
      this.messageService.warning('No podcast selected.');
      return;
    }
    const selectedNewsIds = this.getSelectedNewsIds();
    this.subscriptions.add(
      this.newsService.news(this.selectedPodcastId, this.selectedHours).subscribe({
        next: (data: News) => {
          this.news = data;
          this.filteredNews = this.news?.results || [];
          this.reapplySelection(selectedNewsIds);
          this.applyFilter(null);
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

  private getSelectedNewsIds(): number[] {
    return [...this.selectedNews].map((entry) => Number(entry.id));
  }

  private reapplySelection(selectedNewsIds: number[]): void {
    this.selectedNews.clear();
    this.filteredNews.forEach((news) => {
      if (selectedNewsIds.includes(Number(news.id))) {
        this.selectedNews.add(news);
      }
    });
  }

  applyFilter(target: EventTarget | null) {
    this.filterTarget = target === null ? this.filterTarget : (target as HTMLInputElement);
    const filterValue = this.filterTarget?.value;

    if (!filterValue) {
      this.filteredNews = this.news?.results || [];
      return;
    }

    let lowerCaseFilter = filterValue.toLowerCase();
    let isNegated = false;

    if (lowerCaseFilter.startsWith('-')) {
      isNegated = true;
      lowerCaseFilter = lowerCaseFilter.substring(1); // Remove the '-' at the beginning
      lowerCaseFilter = lowerCaseFilter.trim(); // Remove any leading/trailing whitespace
    }

    if (isNegated) {
      this.filteredNews =
        this.news?.results.filter(
          (news: NewsResult) =>
            !(
              news.title.toLowerCase().includes(lowerCaseFilter) ||
              news.description.toLowerCase().includes(lowerCaseFilter) ||
              news.summary.toLowerCase().includes(lowerCaseFilter) ||
              news.source.toLowerCase().includes(lowerCaseFilter)
            ),
        ) || [];
    } else {
      this.filteredNews =
        this.news?.results.filter(
          (news: NewsResult) =>
            news.title.toLowerCase().includes(lowerCaseFilter) ||
            news.description.toLowerCase().includes(lowerCaseFilter) ||
            news.summary.toLowerCase().includes(lowerCaseFilter) ||
            news.source.toLowerCase().includes(lowerCaseFilter),
        ) || [];
    }
  }

  selectAll() {
    this.selectedNews = new Set(this.filteredNews);
  }

  unselectAll() {
    this.selectedNews.clear();
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

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.toolbarService.clearToolbarComponent();
  }
}
