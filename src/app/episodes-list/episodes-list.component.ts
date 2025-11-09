// Copyright (c) 2025 Perpetuator LLC
import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { MatCard, MatCardHeader, MatCardContent } from '@angular/material/card';
import { Router, RouterLink } from '@angular/router';
import { MatOption } from '@angular/material/core';
import { MessageComponent } from '../message/message.component';
import { ToolbarService } from '../toolbar.service';
import { MessageService } from '../message.service';
import { Episode, EpisodeService } from '../episode.service';
import { Subscription, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { MatIcon } from '@angular/material/icon';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import {
  MatCell,
  MatCellDef,
  MatColumnDef,
  MatHeaderCell,
  MatHeaderCellDef,
  MatHeaderRow,
  MatHeaderRowDef,
  MatRow,
  MatRowDef,
  MatTable,
  MatTableDataSource,
} from '@angular/material/table';
import { MatSort, Sort } from '@angular/material/sort';
import { MatFormField, MatLabel, MatPrefix } from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';
import { PodcastsResult, PodcastsService } from '../podcasts.service';
import { SvgIconComponent } from '../svg-icon/svg-icon.component';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDeleteDialogComponent } from '../confirm-delete-dialog/confirm-delete-dialog.component';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatInput } from '@angular/material/input';
import { CommonModule } from '@angular/common';
import { LoadingService } from '../loading.service';
import { MatTooltip } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import {
  CreateEpisodeDialogComponent,
  CreateEpisodeDialogResult,
} from '../create-episode-dialog/create-episode-dialog.component';
import { NewsService } from '../news.service';
import { Job, JobService } from '../job.service';
import { RecentlyUsedPodcastsService } from '../recently-used-podcasts.service';
import { ResearchService, Topic } from '../research.service';
import { SelectTopicDialogComponent } from '../select-topic-dialog/select-topic-dialog.component';

@Component({
  selector: 'app-episodes-list',
  standalone: true,
  imports: [
    FormsModule,
    MatButton,
    MatCard,
    SvgIconComponent,
    MatCardHeader,
    MatIcon,
    MessageComponent,
    MatProgressBarModule,
    MatCardContent,
    MatTable,
    MatSort,
    MatHeaderCell,
    MatCell,
    MatHeaderRow,
    MatRow,
    MatHeaderCellDef,
    MatCellDef,
    MatHeaderRowDef,
    MatRowDef,
    MatColumnDef,
    MatMenuTrigger,
    MatMenu,
    RouterLink,
    MatFormField,
    MatLabel,
    MatSelect,
    MatOption,
    MatPaginator,
    MatCheckboxModule,
    MatMenuItem,
    MatPrefix,
    MatIconButton,
    MatIconButton,
    MatButton,
    MatInput,
    CommonModule,
    MatTooltip,
  ],
  templateUrl: './episodes-list.component.html',
  styleUrls: ['./episodes-list.component.scss'],
})
export class EpisodesListComponent implements OnInit, OnDestroy {
  private subscriptions = new Subscription();
  episodes: Episode[] = [];
  dataSource = new MatTableDataSource(this.episodes);
  displayedColumns: string[] = ['title', 'podcast', 'status', 'actions'];
  totalEpisodes = 0;
  pageSize = 10;
  sortDirection = 'DESC';
  sortActive = 'date';
  loadingEpisodes = false;
  loadingPodcasts = false;
  selectedPodcast: string | null = null;
  podcasts: PodcastsResult[] = [];
  topics: Topic[] = [];
  cursors: (string | null)[] = [null];
  isGridView = false;
  searchTerm = '';
  private searchSubject = new Subject<string>();
  selectedLiveStatus: string | null = null; // null = all, 'live' = live only, 'draft' = draft only
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;

  constructor(
    private router: Router,
    private messageService: MessageService,
    private toolbarService: ToolbarService,
    private episodeService: EpisodeService,
    private podcastsService: PodcastsService,
    private dialog: MatDialog,
    private loadingService: LoadingService,
    private newsService: NewsService,
    private jobService: JobService,
    private recentlyUsedPodcastsService: RecentlyUsedPodcastsService,
    private researchService: ResearchService,
  ) {}

  ngOnInit(): void {
    const viewContainerRef = this.toolbarService.getViewContainerRef();
    viewContainerRef.clear();
    viewContainerRef.createEmbeddedView(this.toolbarTemplate);

    this.subscriptions.add(
      this.searchSubject.pipe(debounceTime(300), distinctUntilChanged()).subscribe((searchTerm) => {
        this.searchTerm = searchTerm;
        this.cursors = [null];
        if (this.paginator) {
          this.paginator.pageIndex = 0;
        }
        this.loadEpisodes();
      }),
    );

    this.loadEpisodes();
    this.loadPodcasts();
    this.loadTopics();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.loadingService.hide(); // Make sure to hide loading when component is destroyed
  }

  toggleView(isGrid: boolean) {
    this.isGridView = isGrid;
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchSubject.next(input.value);
  }

  loadEpisodes(after: string | null = null, pageIndex = 0) {
    this.loadingEpisodes = true;
    this.loadingService.show();

    const searchTerm = this.searchTerm.trim() || null;

    this.subscriptions.add(
      this.episodeService
        .getEpisodes(this.pageSize, after, this.sortActive, this.sortDirection, this.selectedPodcast, searchTerm)
        .subscribe({
          next: ({ episodes, pageInfo }) => {
            let filteredEpisodes = episodes;

            // Apply live status filter client-side
            if (this.selectedLiveStatus === 'live') {
              filteredEpisodes = filteredEpisodes.filter((e) => e.isLive);
            } else if (this.selectedLiveStatus === 'draft') {
              filteredEpisodes = filteredEpisodes.filter((e) => !e.isLive);
            }

            this.episodes = filteredEpisodes;
            this.dataSource.data = filteredEpisodes;
            this.cursors[pageIndex + 1] = pageInfo.endCursor ?? null;
            this.totalEpisodes = pageInfo.hasNextPage
              ? (pageIndex + 2) * this.pageSize
              : (pageIndex + 1) * this.pageSize;
            this.loadingEpisodes = false;
            this.loadingService.hide(); // Hide global loading spinner
          },
          error: (err) => {
            this.messageService.error('Failed to load episodes: ' + err);
            this.loadingEpisodes = false;
            this.loadingService.hide(); // Hide global loading spinner on error
          },
          complete: () => {
            this.loadingEpisodes = false;
            this.loadingService.hide(); // Hide global loading spinner on complete
          },
        }),
    );
  }

  loadPodcasts() {
    this.loadingPodcasts = true;

    // Load podcast history first
    this.subscriptions.add(
      this.recentlyUsedPodcastsService.loadHistory().subscribe({
        next: () => {
          // Then load podcasts
          this.subscriptions.add(
            this.podcastsService.getPodcastsForFilter().subscribe({
              next: (response) => {
                // Sort by recently used
                this.podcasts = this.recentlyUsedPodcastsService.sortByRecentlyUsed(response.podcasts);

                // Auto-select if only one podcast or use most recent
                if (!this.selectedPodcast) {
                  this.selectedPodcast = this.recentlyUsedPodcastsService.getDefaultSelection(this.podcasts);
                }

                this.loadingPodcasts = false;
              },
              error: (err: { message: string }) => {
                this.loadingPodcasts = false;
                this.messageService.error(`Failed to retrieve podcasts data: ${err.message}`);
              },
              complete: () => {
                this.loadingPodcasts = false;
              },
            }),
          );
        },
      }),
    );
  }

  loadTopics(): void {
    this.subscriptions.add(
      this.researchService.getTopics(undefined, 100).subscribe({
        next: (response) => {
          this.topics = response.topics;
        },
        error: (err: { message: string }) => {
          this.messageService.error(`Failed to retrieve research topics: ${err.message}`);
        },
      }),
    );
  }

  onPodcastChange(): void {
    // Record podcast selection if one is selected
    if (this.selectedPodcast) {
      this.recentlyUsedPodcastsService.recordSelection(this.selectedPodcast);
    }
    this.loadEpisodes();
  }

  onLiveStatusFilterChange(): void {
    this.cursors = [null];
    if (this.paginator) {
      this.paginator.pageIndex = 0;
    }
    this.loadEpisodes();
  }

  sortChange(sortState: Sort) {
    this.sortActive = sortState.active;
    this.sortDirection = sortState.direction.toUpperCase();
    this.cursors = [null]; // reset all known cursors
    this.paginator.firstPage();
    this.loadEpisodes();
  }

  onPageChange(event: PageEvent) {
    this.loadingEpisodes = true;
    const newPageIndex = event.pageIndex;
    const newPageSize = event.pageSize;

    // If pageSize changed, reset pagination
    if (newPageSize !== this.pageSize) {
      this.pageSize = newPageSize;
      this.cursors = [null];
      this.loadEpisodes(null, 0);
      return;
    }

    const after = this.cursors[newPageIndex] ?? null;
    this.loadEpisodes(after, newPageIndex);
  }

  viewEpisode(uuid: string) {
    this.router.navigate(['/e', uuid]);
  }

  deleteEpisode(episode: Episode) {
    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      data: {
        title: 'Delete Episode',
        message: `Are you sure you want to delete the episode "${episode.title}"? This action cannot be undone.`,
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.subscriptions.add(
          this.episodeService.deleteEpisode(episode.uuid).subscribe({
            next: () => {
              this.messageService.success('Episode deleted successfully');
              this.loadEpisodes(); // Reload the episodes list
            },
            error: (err) => {
              this.messageService.error(`Failed to delete episode: ${err.message}`);
            },
          }),
        );
      }
    });
  }

  openCreateEpisodeDialog(): void {
    const dialogRef = this.dialog.open(CreateEpisodeDialogComponent, {
      width: '600px',
      data: {
        podcasts: this.podcasts,
      },
    });

    dialogRef.afterClosed().subscribe((result: CreateEpisodeDialogResult | null) => {
      if (result) {
        this.handleEpisodeCreation(result);
      }
    });
  }

  private handleEpisodeCreation(result: CreateEpisodeDialogResult): void {
    switch (result.episodeType) {
      case 'blank':
        this.createBlankEpisode(result.podcastUuid);
        break;
      case 'news':
        this.createNewsEpisode(result.podcastUuid);
        break;
      case 'research':
        this.createResearchEpisode(result.podcastUuid);
        break;
    }
  }

  private createBlankEpisode(podcastUuid: string): void {
    const newsUuids: string[] = [];
    this.subscriptions.add(
      this.newsService.createEpisode(newsUuids, podcastUuid).subscribe({
        next: (data: { job: Job | null }) => {
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

  private createNewsEpisode(podcastUuid: string): void {
    this.subscriptions.add(
      this.podcastsService.createLatestNewsEpisodeChain(podcastUuid).subscribe({
        next: (data: { jobs: Job[] }) => {
          if (!data.jobs || data.jobs.length === 0) {
            this.messageService.error('Failed to create news episode: No jobs returned');
            return;
          }
          this.messageService.info('Creating news episode from latest news...');
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

  private createResearchEpisode(podcastUuid: string): void {
    // Open dialog to select research topic
    const dialogRef = this.dialog.open(SelectTopicDialogComponent, {
      width: '600px',
      data: {
        podcastUuid,
        topics: this.topics,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.topicUuid) {
        this.subscriptions.add(
          this.researchService.publishResearchTopicEpisodeChain(podcastUuid, result.topicUuid).subscribe({
            next: (data) => {
              if (!data.jobs || data.jobs.length === 0) {
                this.messageService.error('Failed to create research episode: No jobs returned');
                return;
              }
              this.messageService.info('Creating research episode from topic...');
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
    });
  }

  isEpisodeFullyValidated(episode: Episode): boolean {
    if (!episode.versions || episode.versions.length === 0) return false;
    const currentVersion = episode.versions.find((v) => v.versionNumber === episode.currentVersionNumber);
    if (!currentVersion) return false;
    return currentVersion.validatedCompliance && currentVersion.validatedFacts && currentVersion.validatedLength;
  }

  getEpisodeValidationTooltip(episode: Episode): string {
    if (!episode.versions || episode.versions.length === 0) return 'No version information available';
    const currentVersion = episode.versions.find((v) => v.versionNumber === episode.currentVersionNumber);
    if (!currentVersion) return 'No current version found';

    const parts: string[] = [];
    parts.push(`Facts: ${currentVersion.validatedFacts ? '✓' : '✗'}`);
    parts.push(`Length: ${currentVersion.validatedLength ? '✓' : '✗'}`);
    parts.push(`Compliance: ${currentVersion.validatedCompliance ? '✓' : '✗'}`);

    const status = this.isEpisodeFullyValidated(episode) ? 'Validated' : 'Not Validated';
    return `${status}\n - ${parts.join('\n - ')}`;
  }
}
