import { Component, OnInit, OnDestroy, ViewChild, TemplateRef, AfterViewInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { CryptoNewsService } from '../crypto-news.service';
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
import { TeamsService } from '../teams.service';
import { TeamsResult } from '../teams-list/teams-list.component';
import { MatOption, MatSelect } from '@angular/material/select';
import { CustomTooltipComponent } from '../custom-tooltip/custom-tooltip.component';
import { UserService } from '../user.service';
import { JobStatusBarComponent } from '../job-status-bar/job-status-bar.component';

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
    CustomTooltipComponent,
    JobStatusBarComponent,
  ],
  templateUrl: './crypto-news.component.html',
  styleUrl: './crypto-news.component.scss',
})
export class CryptoNewsComponent implements OnInit, OnDestroy, AfterViewInit {
  private subscriptions: Subscription = new Subscription();
  newsData: CryptoNewsData | null = null;
  filteredNews: CryptoNewsResult[] = [];
  selectedNews = new Set<CryptoNewsResult>();
  teams: TeamsResult[] = [];
  selectedTeamId: number | null = null;

  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;
  @ViewChild(JobStatusBarComponent) jobStatusBar!: JobStatusBarComponent;

  constructor(
    private cryptoNewsService: CryptoNewsService,
    private messageService: MessageService,
    private toolbarService: ToolbarService,
    private teamsService: TeamsService,
    protected userService: UserService,
  ) {}

  ngOnInit(): void {
    const viewContainerRef = this.toolbarService.getViewContainerRef();
    viewContainerRef.clear();
    viewContainerRef.createEmbeddedView(this.toolbarTemplate);
    this.getNews();
    this.filteredNews = this.newsData?.results || [];

    this.subscriptions.add(
      this.teamsService.getMyTeams().subscribe((teams) => {
        this.teams = teams.filter((team) =>
          team.members.some((member) => member.role === 'publisher' || member.role === 'owner'),
        );
        if (this.teams.length > 0) {
          this.selectedTeamId = this.teams[0].id;
        }
      }),
    );
  }

  ngAfterViewInit() {
    this.subscriptions.add(
      this.jobStatusBar.jobCompleted$.subscribe((job) => {
        if (['fetch_crypto_news', 'extract_crypto_news', 'summarize_crypto_news'].includes(job.jobType)) {
          this.getNews();
        } else if (['create_crypto_article'].includes(job.jobType)) {
          const newArticleUrl = `/crypto-article/${job.result}`;
          this.messageService.success(`New article URL: <a href="${newArticleUrl}">${newArticleUrl}</a>`, null, true);
        }
      }),
    );
  }

  fetchNews() {
    this.subscriptions.add(
      this.cryptoNewsService.fetchCryptoNewsData().subscribe((data) => {
        this.jobStatusBar.addJob(data.job);
      }),
    );
  }

  extractSelectedNews() {
    if (this.selectedNews.size === 0) {
      this.messageService.warning('No news items selected.');
      return;
    }
    this.messageService.info('Extracting content from selected news items (this may take a while)...');

    const newsIds = [...this.selectedNews].map((entry) => Number(entry.id));
    this.subscriptions.add(
      this.cryptoNewsService.extractCryptoNews(newsIds).subscribe({
        next: (data) => {
          if (!data.job) {
            this.messageService.error('Failed to extract news: No job returned');
            return;
          }
          this.jobStatusBar.addJob(data.job);
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
    this.messageService.info('Summarizing content of selected news items (this may take a while)...');
    const newsIds = [...this.selectedNews].map((entry) => Number(entry.id));
    this.summarizeNews(newsIds);
  }

  regenerateSummary(id: string) {
    this.messageService.info('Regenerating summary for news item (this may take a while)...');
    this.summarizeNews([Number(id)], true);
  }

  private summarizeNews(newsIds: number[], force = false) {
    this.subscriptions.add(
      this.cryptoNewsService.summarizeCryptoNews(newsIds, force).subscribe({
        next: (data) => {
          if (!data.job) {
            this.messageService.error('Failed to summarize news data: No job returned');
            return;
          }
          this.jobStatusBar.addJob(data.job);
        },
        error: (error) => {
          this.messageService.error(`Failed to summarize news data: ${error.message}`);
        },
      }),
    );
  }

  createArticleChainFromSelected() {
    if (this.selectedNews.size === 0) {
      this.messageService.warning('No news items selected.');
      return;
    }
    if (this.selectedTeamId === null) {
      this.messageService.warning('No team selected.');
      return;
    }
    this.messageService.info('Creating crypto article from selected news items (this may take a while)...');

    const newsIds = [...this.selectedNews].map((entry) => Number(entry.id));
    this.subscriptions.add(
      this.cryptoNewsService.createCryptoArticleChain(newsIds, this.selectedTeamId).subscribe({
        next: (data) => {
          if (!data.jobs) {
            this.messageService.error('Failed to create article: No jobs returned');
            return;
          }
          this.jobStatusBar.addJobs(data.jobs);
        },
        error: (err: { message: string }) => {
          this.messageService.error(err.message);
        },
      }),
    );
  }

  createArticleFromSelected() {
    if (this.selectedNews.size === 0) {
      this.messageService.warning('No news items selected.');
      return;
    }
    if (this.selectedTeamId === null) {
      this.messageService.warning('No team selected.');
      return;
    }
    this.messageService.info('Creating crypto article from selected news items (this may take a while)...');

    const newsIds = [...this.selectedNews].map((entry) => Number(entry.id));
    this.subscriptions.add(
      this.cryptoNewsService.createCryptoArticle(newsIds, this.selectedTeamId).subscribe({
        next: (data) => {
          if (!data.job) {
            this.messageService.error('Failed to create article: No job returned');
            return;
          }
          this.jobStatusBar.addJob(data.job);
        },
        error: (err: { message: string }) => {
          this.messageService.error(err.message);
        },
      }),
    );
  }

  getNews() {
    const selectedNewsIds = this.getSelectedNewsIds();
    this.subscriptions.add(
      this.cryptoNewsService.getCryptoNews().subscribe({
        next: (data: CryptoNewsData) => {
          this.newsData = data;
          this.filteredNews = this.newsData?.results || [];
          this.reapplySelection(selectedNewsIds);
        },
        error: (err: { message: string }) => {
          this.messageService.error(`Failed to get crypto news data: ${err.message}`);
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
}
