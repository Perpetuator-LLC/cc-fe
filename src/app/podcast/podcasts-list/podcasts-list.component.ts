// Copyright (c) 2025 Perpetuator LLC
import { Component, Input, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { MatCard, MatCardContent, MatCardHeader } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { ToolbarService } from '../../toolbar.service';
import { MessageService } from '../../message.service';
import { PodcastsResult, PodcastsService } from '../podcasts.service';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButton, MatButtonModule } from '@angular/material/button';
import {
  MatTable,
  MatHeaderCell,
  MatCell,
  MatHeaderRow,
  MatRow,
  MatHeaderCellDef,
  MatCellDef,
  MatHeaderRowDef,
  MatRowDef,
  MatColumnDef,
} from '@angular/material/table';
import { MatTooltip } from '@angular/material/tooltip';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialog } from '@angular/material/dialog';
import { CreatePodcastDialogComponent } from '../create-podcast-dialog/create-podcast-dialog.component';
import { MatPaginator } from '@angular/material/paginator';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';
import { SvgIconComponent } from '../../svg-icon/svg-icon.component';
import { NewsService } from '../../news/news.service';
import { EpisodeService } from '../../episode/episode.service';
import { Job, JobService } from '../../jobs/job.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { ResearchService } from '../../topics/research.service';
import { JobDisplayService } from '../../job-display.service';
import { LoadingService } from '../../loading.service';
import { TeamsService, TeamsResult } from '../../team/teams.service';
import { MatSelectModule } from '@angular/material/select';
import { RelayPaginatorBase } from '../../utils/relay-paginator';

export interface ColumnOption {
  id: string;
  label: string;
  selected: boolean;
}

@Component({
  selector: 'app-podcasts-list',
  standalone: true,
  imports: [
    MatButton,
    MatCard,
    SvgIconComponent,
    MatCardHeader,
    MatIcon,

    MatProgressBarModule,
    MatCardContent,
    MatTable,
    MatHeaderCell,
    MatCell,
    MatHeaderRow,
    MatRow,
    MatHeaderCellDef,
    MatCellDef,
    MatHeaderRowDef,
    MatRowDef,
    MatColumnDef,
    MatTooltip,
    MatMenuTrigger,
    MatMenu,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatPaginator,
    MatCheckboxModule,
    FormsModule,
    MatMenuItem,
    MatSelectModule,
  ],
  templateUrl: './podcasts-list.component.html',
  styleUrls: ['./podcasts-list.component.scss'],
})
export class PodcastsListComponent extends RelayPaginatorBase<PodcastsResult> implements OnInit, OnDestroy {
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;
  private subscriptions = new Subscription();
  @Input() podcasts: PodcastsResult[] = [];
  protected loading = false;
  // dataSource, paginator, cursors, pageSize, totalItems inherited from RelayPaginatorBase
  displayedColumns: string[] = [
    'name',
    'team',
    'latestInternalEpisodeDate',
    'tgResponse',
    'enabled',
    'createEpisode',
    'actions',
  ];
  isGridView = false;
  pageSizeOptions = [5, 10, 25, 50];
  hasNextPage = false;
  hasPreviousPage = false;
  totalPodcasts = 0; // Keep for template binding compatibility
  allColumns: ColumnOption[] = [
    { id: 'name', label: 'Podcast Name', selected: true },
    { id: 'team', label: 'Team', selected: true },
    { id: 'tgChannelId', label: 'Telegram ID', selected: false },
    { id: 'latestInternalEpisodeDate', label: 'Latest Episode', selected: true },
    { id: 'enabled', label: 'Live', selected: true },
    { id: 'tgResponse', label: 'Telegram Connected', selected: true },
    { id: 'createEpisode', label: 'Create Episode', selected: true },
    { id: 'actions', label: 'Actions', selected: true },
  ];
  searchString: string | null = null;
  searchTerm$ = new Subject<string>();
  jobs: Job[] = [];
  teams: TeamsResult[] = [];
  selectedTeam: string | null = null;
  loadingTeams = false;
  selectedLiveStatus: string | null = null; // null = all, 'live' = enabled only, 'disabled' = disabled only
  orderBy = '-latest_internal_episode_date'; // Default sort by latest internal episode (all episodes), descending

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private messageService: MessageService,
    private toolbarService: ToolbarService,
    private podcastsService: PodcastsService,
    private dialog: MatDialog,
    private newsService: NewsService,
    private episodeService: EpisodeService,
    private jobService: JobService,
    private researchService: ResearchService,
    private jobDisplayService: JobDisplayService,
    private loadingService: LoadingService,
    private teamsService: TeamsService,
  ) {
    super();

    this.searchTerm$.pipe(debounceTime(1000), distinctUntilChanged()).subscribe((term) => {
      this.searchString = term;
      this.cursors = [null];
      if (this.paginator) {
        this.paginator.firstPage();
      }
      this.loadPage(this.pageSize, null, 0);
    });

    // Subscribe to job updates - no messages needed, job-status-bar handles them globally
    this.subscriptions.add(
      toObservable(this.jobService.jobs).subscribe({
        next: (jobs) => {
          // Just track jobs, no need to handle completions - job-status-bar shows all messages
          this.jobs = jobs;
        },
        error: (error) => {
          this.messageService.error(`Failed to load jobs signal: ${error.message}`);
        },
      }),
    );
  }

  ngOnInit(): void {
    this.messageService.clearMessages();
    this.toolbarService.setToolbarTemplate(this.toolbarTemplate);
    this.loadTeams();
    this.loadPage(this.pageSize, null, 0);

    // Check for query parameter to auto-open create dialog
    this.subscriptions.add(
      this.route.queryParams.subscribe((params) => {
        if (params['create'] === 'true') {
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {},
            replaceUrl: true,
          });
          setTimeout(() => this.createPodcast(), 0);
        }
      }),
    );
  }

  protected loadPage(pageSize: number, cursor: string | null, pageIndex: number): void {
    this.loading = true;
    this.loadingService.show();

    let enabledFilter: boolean | null = null;
    if (this.selectedLiveStatus === 'live') {
      enabledFilter = true;
    } else if (this.selectedLiveStatus === 'disabled') {
      enabledFilter = false;
    }

    this.subscriptions.add(
      this.podcastsService
        .getPodcasts(
          pageSize,
          cursor,
          this.searchString || undefined,
          undefined,
          this.selectedTeam || undefined,
          enabledFilter !== null ? enabledFilter : undefined,
          this.orderBy,
        )
        .subscribe({
          next: (response) => {
            this.messageService.clearMessages();
            this.podcasts = response.podcasts;
            this.hasNextPage = response.pageInfo.hasNextPage;
            this.hasPreviousPage = response.pageInfo.hasPreviousPage;

            this.handlePageData(this.podcasts, response.pageInfo, pageIndex);
            this.totalPodcasts = this.totalItems;

            this.loading = false;
            this.loadingService.hide();
          },
          error: (err: { message: string }) => {
            this.loading = false;
            this.loadingService.hide();
            this.messageService.error(`Failed to retrieve podcasts data: ${err.message}`);
          },
          complete: () => {
            this.loading = false;
            this.loadingService.hide();
          },
        }),
    );
  }

  viewPodcast(uuid: string) {
    this.router.navigate(['/p', uuid]);
  }

  protected formatTimeAgo(dateString: string | null): string {
    if (!dateString) return 'Never';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 365) {
      const years = Math.floor(diffDays / 365);
      return `${years} year${years > 1 ? 's' : ''} ago`;
    } else if (diffDays > 30) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? 's' : ''} ago`;
    } else if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  }

  protected formatViewCount(count: number): string {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M views`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K views`;
    } else if (count === 1) {
      return '1 view';
    } else {
      return `${count} views`;
    }
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.loadingService.hide();
  }

  createPodcast(): void {
    const dialogRef = this.dialog.open(CreatePodcastDialogComponent, {
      width: '500px',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadPage(this.pageSize, null, 0);
      }
    });
  }

  loadTeams(): void {
    this.loadingTeams = true;
    this.subscriptions.add(
      this.teamsService.getTeams().subscribe({
        next: (response) => {
          this.teams = response.teams;
          this.loadingTeams = false;
        },
        error: (err) => {
          this.messageService.error(`Failed to load teams: ${err.message}`);
          this.loadingTeams = false;
        },
      }),
    );
  }

  onTeamFilterChange(): void {
    this.cursors = [null];
    if (this.paginator) {
      this.paginator.firstPage();
    }
    this.loadPage(this.pageSize, null, 0);
  }

  onLiveStatusFilterChange() {
    this.cursors = [null];
    if (this.paginator) {
      this.paginator.firstPage();
    }
    this.loadPage(this.pageSize, null, 0);
  }

  onSortChange(field: string) {
    // Toggle between ascending and descending if clicking the same field
    // For latest_episode_date, we need special handling to put nulls last
    // const isLatestEpisodeField = field === 'latest_episode_date';

    if (this.orderBy === field || this.orderBy === `-${field}`) {
      // Toggle direction
      if (this.orderBy === field) {
        this.orderBy = `-${field}`;
      } else {
        this.orderBy = field;
      }
    } else {
      // New field, default to descending
      this.orderBy = `-${field}`;
    }

    this.cursors = [null];
    if (this.paginator) {
      this.paginator.firstPage();
    }
    this.loadPage(this.pageSize, null, 0);
  }

  getSortDirection(field: string): 'asc' | 'desc' | null {
    if (this.orderBy === field) return 'asc';
    if (this.orderBy === `-${field}`) return 'desc';
    return null;
  }

  toggleView(isGrid: boolean) {
    this.isGridView = isGrid;
  }

  updateDisplayedColumns(): void {
    this.displayedColumns = this.allColumns.filter((column) => column.selected).map((column) => column.id);
  }

  isColumnSelected(columnId: string): boolean {
    const column = this.allColumns.find((col) => col.id === columnId);
    return column ? column.selected : false;
  }

  _countCategories(podcast: PodcastsResult) {
    return podcast?.categories ? Object.keys(podcast?.categories)?.length : 0;
  }

  onSearchChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm$.next(value);
  }

  createBlankEpisode(podcastUuid: string) {
    const newsUuids: string[] = [];
    this.subscriptions.add(
      this.newsService.createEpisode(newsUuids, podcastUuid).subscribe({
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

  createLatestEpisode(podcastUuid: string) {
    this.subscriptions.add(
      this.podcastsService.createLatestNewsEpisodeChain(podcastUuid).subscribe({
        next: (data) => {
          if (!data.jobs || data.jobs.length === 0) {
            this.messageService.error('Failed to create latest episode: No jobs returned');
            return;
          }
          this.messageService.info('Creating latest episode from news...');
          // Add all jobs to the job service for tracking
          data.jobs.forEach((job) => {
            this.jobService.addJob(job);
          });
        },
        error: (err: { message: string }) => {
          this.messageService.error(err.message);
        },
      }),
    );
  }

  createResearchEpisode(podcastUuid: string) {
    this.subscriptions.add(
      this.researchService.createResearchChain(podcastUuid).subscribe({
        next: (data) => {
          if (!data.jobs || data.jobs.length === 0) {
            this.messageService.error('Failed to start research: No jobs returned');
            return;
          }
          this.messageService.info(`Research started! ${data.jobs.length} jobs created.`);
          data.jobs.forEach((job) => {
            this.jobService.addJob(job);
          });
        },
        error: (err: { message: string }) => {
          this.messageService.error(`Failed to start research: ${err.message}`);
        },
      }),
    );
  }
}
