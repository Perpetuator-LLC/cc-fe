// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, OnDestroy, OnInit, ViewChild, AfterViewInit, Input, inject } from '@angular/core';
import { MatCard, MatCardHeader } from '@angular/material/card';
import { Router, RouterLink } from '@angular/router';
import { MatOption } from '@angular/material/core';
import { Episode, EpisodeService } from '../episode.service';
import { Subscription, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { MatIcon } from '@angular/material/icon';
import { MatPaginator } from '@angular/material/paginator';
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
} from '@angular/material/table';
import { MatSort, Sort } from '@angular/material/sort';
import { MatFormField, MatLabel, MatPrefix } from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { MatDivider } from '@angular/material/divider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDeleteDialogComponent } from '../../confirm-delete-dialog/confirm-delete-dialog.component';
import { MatIconButton } from '@angular/material/button';
import { MatInput } from '@angular/material/input';
import { CommonModule } from '@angular/common';
import { MatTooltip } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { RelayPaginatorBase } from '../../utils/relay-paginator';
import { PodcastsResult, PodcastsService } from '../../podcast/podcasts.service';
import { MessageService } from '../../message.service';
import { LoadingService } from '../../layout/loading.service';
import { AudioPlayerService, AudioTrack } from '../../shared/audio-player/audio-player.service';

/** Pre-computed display state attached to each row. */
interface EpisodeDisplay {
  hasAudio: boolean;
  formattedDuration: string;
  isFullyValidated: boolean;
  validationTooltip: string;
  /** Pre-computed material icon name for the validation badge. */
  validationIcon: string;
  /** Pre-computed CSS class for the validation badge icon. */
  validationIconClass: string;
}

interface EpisodeWithDisplay extends Episode {
  display: EpisodeDisplay;
}

@Component({
  selector: 'app-episodes-table',
  standalone: true,
  imports: [
    FormsModule,
    MatCard,
    MatCardHeader,
    MatIcon,
    MatProgressBarModule,
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
    MatDivider,
    MatPrefix,
    MatIconButton,
    MatInput,
    CommonModule,
    MatTooltip,
  ],
  templateUrl: './episodes-table.component.html',
  styleUrls: ['./episodes-table.component.scss'],
})
export class EpisodesTableComponent
  extends RelayPaginatorBase<EpisodeWithDisplay>
  implements OnInit, OnDestroy, AfterViewInit
{
  @Input() podcastUuid: string | null = null;
  @Input() showPodcastColumn = true;
  @Input() showSearchAndFilters = true;
  @Input() showCreateButton = false;

  private subscriptions = new Subscription();
  // Dependencies
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly episodeService = inject(EpisodeService);
  private readonly podcastsService = inject(PodcastsService);
  private readonly dialog = inject(MatDialog);
  private readonly loadingService = inject(LoadingService);
  private readonly audioPlayerService = inject(AudioPlayerService);

  episodes: EpisodeWithDisplay[] = [];
  displayedColumns: string[] = ['title', 'podcast', 'status', 'actions'];
  totalEpisodes = 0;
  sortDirection = 'DESC';
  sortActive = 'date';
  loadingEpisodes = false;
  loadingPodcasts = false;
  selectedPodcast: string | null = null;
  podcasts: PodcastsResult[] = [];
  isGridView = false;
  searchTerm = '';
  private searchSubject = new Subject<string>();
  selectedLiveStatus: string | null = null;
  @ViewChild(MatSort) sort!: MatSort;

  constructor() {
    super();
  }

  ngOnInit(): void {
    if (!this.showPodcastColumn) {
      this.displayedColumns = this.displayedColumns.filter((col) => col !== 'podcast');
    }

    if (this.podcastUuid) {
      this.selectedPodcast = this.podcastUuid;
    }

    this.subscriptions.add(
      this.searchSubject.pipe(debounceTime(300), distinctUntilChanged()).subscribe((searchTerm) => {
        this.searchTerm = searchTerm;
        this.cursors = [null];
        if (this.paginator) {
          this.paginator.pageIndex = 0;
        }
        this.loadPage(this.pageSize, null, 0);
      }),
    );

    this.loadPage(this.pageSize, null, 0);
    if (this.showSearchAndFilters) {
      this.loadPodcasts();
    }
  }

  override ngAfterViewInit() {
    super.ngAfterViewInit();
    this.dataSource.sort = this.sort;
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.loadingService.hide();
  }

  toggleView(isGrid: boolean) {
    this.isGridView = isGrid;
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchSubject.next(input.value);
  }

  protected loadPage(pageSize: number, cursor: string | null, pageIndex: number): void {
    this.loadingEpisodes = true;
    this.loadingService.show();

    const searchTerm = this.searchTerm.trim() || null;
    const podcastFilter = this.podcastUuid || this.selectedPodcast;

    let isLiveFilter: boolean | null = null;
    if (this.selectedLiveStatus === 'live') {
      isLiveFilter = true;
    } else if (this.selectedLiveStatus === 'draft') {
      isLiveFilter = false;
    }

    this.subscriptions.add(
      this.episodeService
        .getEpisodes(pageSize, cursor, this.sortActive, this.sortDirection, podcastFilter, searchTerm, isLiveFilter)
        .subscribe({
          next: ({ episodes, pageInfo }) => {
            this.episodes = episodes.map((e) => this.toEpisodeWithDisplay(e));
            this.handlePageData(this.episodes, pageInfo, pageIndex);
            this.totalEpisodes = this.totalItems;

            this.loadingEpisodes = false;
            this.loadingService.hide();
          },
          error: (err) => {
            this.messageService.error(err.message);
            this.loadingEpisodes = false;
            this.loadingService.hide();
          },
        }),
    );
  }

  sortChange(sort: Sort) {
    this.sortActive = sort.active;
    this.sortDirection = sort.direction.toUpperCase();

    this.cursors = [null];
    if (this.paginator) {
      this.paginator.pageIndex = 0;
    }
    this.loadPage(this.pageSize, null, 0);
  }

  onPodcastChange() {
    this.cursors = [null];
    if (this.paginator) {
      this.paginator.pageIndex = 0;
    }
    this.loadPage(this.pageSize, null, 0);
  }

  onLiveStatusFilterChange() {
    this.cursors = [null];
    if (this.paginator) {
      this.paginator.pageIndex = 0;
    }
    this.loadPage(this.pageSize, null, 0);
  }

  loadPodcasts() {
    this.loadingPodcasts = true;
    this.subscriptions.add(
      this.podcastsService.getPodcastsForFilter().subscribe({
        next: (response) => {
          this.podcasts = response.podcasts;
          this.loadingPodcasts = false;
        },
        error: (err) => {
          this.messageService.error(err.message);
          this.loadingPodcasts = false;
        },
      }),
    );
  }

  deleteEpisode(episode: Episode) {
    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      data: {
        title: 'Delete Episode',
        message: `Are you sure you want to delete the schedule "${episode.title}"? This action cannot be undone.`,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.subscriptions.add(
          this.episodeService.deleteEpisode(episode.uuid).subscribe({
            next: () => {
              this.messageService.success('Episode deleted successfully!');
              this.loadPage(this.pageSize, null, this.paginator ? this.paginator.pageIndex : 0);
            },
            error: (err) => {
              this.messageService.error(err.message);
            },
          }),
        );
      }
    });
  }

  /** Build an EpisodeWithDisplay by attaching pre-computed display state. */
  private toEpisodeWithDisplay(episode: Episode): EpisodeWithDisplay {
    const isFullyValidated = this.isEpisodeFullyValidated(episode);
    return {
      ...episode,
      display: {
        hasAudio: !!episode.audioUrl,
        formattedDuration: this.formatDuration(episode.audioSeconds),
        isFullyValidated,
        validationTooltip: this.getEpisodeValidationTooltip(episode),
        validationIcon: isFullyValidated ? 'verified' : 'warning',
        validationIconClass: isFullyValidated ? 'validated-icon md3-icon-success' : 'unvalidated-icon md3-icon-warning',
      },
    };
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

  // ==================== AUDIO PLAYER METHODS ====================

  /**
   * Create an AudioTrack from an episode
   */
  private createTrack(episode: Episode): AudioTrack {
    return {
      id: episode.uuid,
      title: episode.title || 'Untitled Episode',
      subtitle: episode.podcast?.name || 'Unknown Podcast',
      audioUrl: episode.audioUrl,
      type: 'episode',
      sourceRoute: `/media/episodes/${episode.uuid}`,
    };
  }

  /**
   * Check if episode has audio available
   */
  hasAudio(episode: Episode): boolean {
    return !!episode.audioUrl;
  }

  /**
   * Format seconds as M:SS or H:MM:SS
   */
  formatDuration(seconds: number | null | undefined): string {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return `${hours}:${remainingMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Play episode immediately
   */
  playEpisode(episode: Episode): void {
    if (!episode.audioUrl) {
      this.messageService.warning('No audio available for this episode');
      return;
    }
    const track = this.createTrack(episode);
    this.audioPlayerService.play(track);
  }

  /**
   * Add episode to play next (after current track)
   */
  playEpisodeNext(episode: Episode): void {
    if (!episode.audioUrl) {
      this.messageService.warning('No audio available for this episode');
      return;
    }
    const track = this.createTrack(episode);
    this.audioPlayerService.playNext(track);
    this.messageService.success('Added to play next');
  }

  /**
   * Add episode to end of queue
   */
  addEpisodeToQueue(episode: Episode): void {
    if (!episode.audioUrl) {
      this.messageService.warning('No audio available for this episode');
      return;
    }
    const track = this.createTrack(episode);
    this.audioPlayerService.addToQueue(track);
    this.messageService.success('Added to queue');
  }
}
