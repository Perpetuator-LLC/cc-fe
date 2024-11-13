import { Component, OnInit, OnDestroy, ViewChild, TemplateRef, Input } from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { CryptoNewsService } from '../crypto-news.service';
import { DatePipe } from '@angular/common';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatList, MatListItem } from '@angular/material/list';
import { MatCard, MatCardContent, MatCardHeader, MatCardSubtitle, MatCardTitle } from '@angular/material/card';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatInput } from '@angular/material/input';
import { MessageService } from '../message.service';
import { MessageComponent } from '../message/message.component';
import { ToolbarService } from '../toolbar.service';
import { MatButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import {
  MatAccordion,
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
} from '@angular/material/expansion';
import { MatTooltip } from '@angular/material/tooltip';
import { MatDivider } from '@angular/material/divider';
import { TeamsService } from '../teams.service';
import { TeamsResult } from '../teams-list/teams-list.component';
import { MatOption, MatSelect } from '@angular/material/select';
import { Job, JobService, jobTypeToString } from '../job.service';
import { CustomTooltipComponent } from '../custom-tooltip/custom-tooltip.component';
import { MatProgressBar } from '@angular/material/progress-bar';

export interface CryptoNewsResult {
  id: string;
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: string;
  content: string;
  summary: string;
}

export interface CryptoNewsData {
  success: boolean;
  message: string;
  results: CryptoNewsResult[];
}

export interface SidePanelAccordianData {
  title: string;
  panelOpenState?: boolean;
}

@Component({
  selector: 'app-crypto-news',
  standalone: true,
  imports: [
    DatePipe,
    MatFormField,
    MatLabel,
    MatList,
    MatListItem,
    MatCard,
    MatCardTitle,
    MatCardSubtitle,
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
    MatAccordion,
    CustomTooltipComponent,
    MatProgressBar,
  ],
  templateUrl: './crypto-news.component.html',
  styleUrl: './crypto-news.component.scss',
})
export class CryptoNewsComponent implements OnInit, OnDestroy {
  jobs: Job[] = [];
  newsData: CryptoNewsData | null = null;
  private subscriptions: Subscription = new Subscription();
  filteredNews: CryptoNewsResult[] = [];
  selectedNews = new Set<CryptoNewsResult>();
  teams: TeamsResult[] = [];
  selectedTeamId: number | null = null;

  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;
  @Input() data: SidePanelAccordianData = {
    title: '',
    panelOpenState: false,
  };

  constructor(
    private cryptoNewsService: CryptoNewsService,
    private messageService: MessageService,
    private toolbarService: ToolbarService,
    private teamsService: TeamsService,
    private jobService: JobService,
  ) {}

  ngOnInit(): void {
    // Initialize with closed state if not provided
    if (this.data.panelOpenState === undefined) {
      this.data.panelOpenState = false;
    }
    const viewContainerRef = this.toolbarService.getViewContainerRef();
    viewContainerRef.clear();
    viewContainerRef.createEmbeddedView(this.toolbarTemplate);
    this.messageService.clearMessages();
    this.getNews();
    this.filteredNews = this.newsData?.results || [];
    this.loadJobs();

    // Polling for job status updates
    this.subscriptions.add(
      // TODO: make 1s if active jobs else 10s
      interval(5000).subscribe(() => {
        this.loadJobs();
      }),
    );
    this.teamsService.getMyTeams().subscribe((teams) => {
      this.teams = teams.filter((team) =>
        team.members.some((member) => member.role === 'publisher' || member.role === 'owner'),
      );
      if (this.teams.length > 0) {
        this.selectedTeamId = this.teams[0].id;
      }
    });
  }

  extractSelectedNews() {
    this.messageService.clearMessages();
    if (this.selectedNews.size === 0) {
      this.messageService.addMessage({
        type: 'warning',
        text: 'No news items selected.',
        dismissible: true,
      });
      return;
    }
    this.messageService.addMessage({
      type: 'info',
      text: 'Extracting content from selected news items (this may take a while)...',
      dismissible: true,
    });

    const newsIds = [...this.selectedNews].map((entry) => Number(entry.id));
    this.subscriptions.add(
      this.cryptoNewsService.extractCryptoNews(newsIds).subscribe({
        next: (data) => {
          this.messageService.clearMessages();
          if (data.success) {
            this.messageService.addMessage({
              type: 'success',
              text: data.message,
              dismissible: true,
            });
          } else {
            this.messageService.addMessage({
              type: 'error',
              text: data.message,
              dismissible: true,
            });
          }
        },
        error: (err: { message: string }) => {
          this.messageService.addMessage({
            type: 'error',
            text: `Failed to extract news data: ${err.message}`,
            dismissible: true,
          });
        },
        complete: () => {
          console.debug('News extracting complete');
          this.getNews();
        },
      }),
    );
  }

  summarizeSelected() {
    this.messageService.clearMessages();
    if (this.selectedNews.size === 0) {
      this.messageService.addMessage({
        type: 'warning',
        text: 'No news items selected.',
        dismissible: true,
      });
      return;
    }
    this.messageService.addMessage({
      type: 'info',
      text: 'Summarizing content of selected news items (this may take a while)...',
      dismissible: true,
    });

    const newsIds = [...this.selectedNews].map((entry) => Number(entry.id));
    this.summarizeNews(newsIds);
  }

  regenerateSummary(id: string) {
    this.messageService.clearMessages();
    this.messageService.addMessage({
      type: 'info',
      text: 'Summarizing content of news (this may take a while)...',
      dismissible: true,
    });

    this.summarizeNews([Number(id)], true);
  }

  private summarizeNews(newsIds: number[], force = false) {
    this.subscriptions.add(
      this.cryptoNewsService.summarizeCryptoNews(newsIds, force).subscribe({
        next: (data) => {
          this.messageService.clearMessages();
          if (data.success) {
            this.messageService.addMessage({
              type: 'success',
              text: data.message,
              dismissible: true,
            });
          } else {
            this.messageService.addMessage({
              type: 'error',
              text: data.message,
              dismissible: true,
            });
          }
        },
        error: (err: { message: string }) => {
          this.messageService.addMessage({
            type: 'error',
            text: `Failed to summarize news data: ${err.message}`,
            dismissible: true,
          });
          this.getNews(); // reload partial data
        },
        complete: () => {
          console.debug('News summarize complete');
          this.getNews();
        },
      }),
    );
  }

  createArticleFromSelected() {
    this.messageService.clearMessages();
    if (this.selectedNews.size === 0) {
      this.messageService.addMessage({
        type: 'warning',
        text: 'No news items selected.',
        dismissible: true,
      });
      return;
    }
    if (this.selectedTeamId === null) {
      this.messageService.addMessage({
        type: 'warning',
        text: 'No team selected.',
        dismissible: true,
      });
      return;
    }
    this.messageService.addMessage({
      type: 'info',
      text: 'Creating crypto article from selected news items (this may take a while)...',
      dismissible: true,
    });

    const newsIds = [...this.selectedNews].map((entry) => Number(entry.id));
    this.subscriptions.add(
      this.cryptoNewsService.createCryptoArticle(newsIds, this.selectedTeamId).subscribe({
        next: (data) => {
          if (data.success) {
            const newArticleUrl = `/crypto-article/${data.results.id}`;
            this.messageService.addMessage({
              type: 'success',
              text: data.message + ` Article URL: <a href="${newArticleUrl}">${newArticleUrl}</a>`,
              dismissible: true,
            });
            // this.router.navigate(['/crypto-article', data.results.id]);
            // console.log('Article Data:', data.results);
          } else {
            this.messageService.addMessage({
              type: 'error',
              text: data.message,
              dismissible: true,
            });
          }
        },
        error: (err: { message: string }) => {
          this.messageService.addMessage({
            type: 'error',
            text: err.message,
            dismissible: true,
          });
        },
      }),
    );
  }

  loadJobs() {
    // collect the currently loaded job ids, so that if one transitions to complete we still display it...
    const currentJobIds = this.jobs.map((job) => job.id);
    this.jobService.getUserJobs(['pending', 'running'], ['fetch_crypto_news'], currentJobIds).subscribe((jobs) => {
      // this.jobService.getUserJobs(['pending', 'running'], 'fetch_crypto_news').subscribe((jobs) => {
      // now filter any jobs over 10s old
      const now = new Date();
      const tenSecondsAgo = new Date(now.getTime() - 10 * 1000); // 10 seconds ago
      this.jobs = jobs.filter((job: Job) => {
        if (job.status === 'completed') {
          const updatedAt = new Date(job.updatedAt);
          return updatedAt >= tenSecondsAgo;
        }
        return true;
      });
      // this.jobs = jobs;
    });
  }

  fetchNews() {
    this.jobService.fetchCryptoNewsData().subscribe((job) => {
      if (this.jobs.length > 0) {
        this.jobs.unshift(job); // Add new job to the top of the list
      } else {
        this.jobs = [job];
      }
    });
  }
  // fetchNews() {
  //   this.messageService.clearMessages();
  //   this.messageService.addMessage({
  //     type: 'info',
  //     text: 'Fetching crypto news data...',
  //     dismissible: true,
  //   });
  //   this.subscriptions.add(
  //     this.cryptoNewsService.fetchCryptoNews().subscribe({
  //       next: () => {
  //         this.messageService.clearMessages();
  //         this.messageService.addMessage({
  //           type: 'success',
  //           text: 'Crypto news data fetched successfully.',
  //           dismissible: true,
  //         });
  //       },
  //       error: (err: { message: string }) => {
  //         this.messageService.clearMessages();
  //         this.messageService.addMessage({
  //           type: 'error',
  //           text: `Failed to fetch crypto news data: ${err.message}`,
  //           dismissible: true,
  //         });
  //       },
  //       complete: () => {
  //         console.debug('News data fetch complete');
  //         this.getNews();
  //       },
  //     }),
  //   );
  // }

  getNews() {
    // this.messageService.addMessage({
    //   type: 'info',
    //   text: 'Loading crypto news data...',
    //   dismissible: true,
    // });
    const selectedNewsIds = this.getSelectedNewsIds();
    this.subscriptions.add(
      this.cryptoNewsService.getCryptoNews().subscribe({
        next: (data: CryptoNewsData) => {
          // this.messageService.clearMessages();
          this.newsData = data;
          this.filteredNews = this.newsData?.results || [];
          this.reapplySelection(selectedNewsIds);
        },
        error: (err: { message: string }) => {
          this.messageService.addMessage({
            type: 'error',
            text: `Failed to get crypto news data: ${err.message}`,
            dismissible: true,
          });
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

  selectLast12Hours() {
    const now = new Date();
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000); // 12 hours ago

    this.selectedNews.clear();
    this.filteredNews.forEach((news) => {
      const publishedDate = new Date(news.publishedAt);
      if (publishedDate >= twelveHoursAgo && publishedDate <= now) {
        this.selectedNews.add(news);
      }
    });
  }

  applyFilter(target: EventTarget | null) {
    const element = target as HTMLInputElement;
    const filterValue = element?.value;

    if (!filterValue) {
      this.filteredNews = this.newsData?.results || [];
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
        this.newsData?.results.filter(
          (news: CryptoNewsResult) =>
            !(
              news.title.toLowerCase().includes(lowerCaseFilter) ||
              news.description.toLowerCase().includes(lowerCaseFilter) ||
              news.summary.toLowerCase().includes(lowerCaseFilter) ||
              news.source.toLowerCase().includes(lowerCaseFilter)
            ),
        ) || [];
    } else {
      this.filteredNews =
        this.newsData?.results.filter(
          (news: CryptoNewsResult) =>
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

  toggleSelection(news: CryptoNewsResult) {
    if (this.selectedNews.has(news)) {
      this.selectedNews.delete(news);
    } else {
      this.selectedNews.add(news);
    }
  }

  isSelected(news: CryptoNewsResult): boolean {
    return this.selectedNews.has(news);
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.toolbarService.clearToolbarComponent();
  }

  protected readonly jobTypeToString = jobTypeToString;

  retryJob(id: string) {
    this.subscriptions.add(
      this.jobService.retryJobs([id]).subscribe({
        next: (jobs: Job[]) => {
          // union the jobs with the existing ones, if the same id exists then replace it
          this.jobs = [...jobs, ...this.jobs.filter((job) => job.id !== id)];
        },
        error: (err: { message: string }) => {
          this.messageService.addMessage({
            type: 'error',
            text: `Failed to retry job: ${err.message}`,
            dismissible: true,
          });
        },
        complete: () => {
          console.debug('Job retry complete');
        },
      }),
    );
  }
}
