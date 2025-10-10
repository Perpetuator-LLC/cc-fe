// Copyright (c) 2025 Perpetuator LLC
import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { MatCard, MatCardHeader, MatCardContent } from '@angular/material/card';
import { Router, RouterLink } from '@angular/router';
import { MatLine, MatOption } from '@angular/material/core';
import { DatePipe, SlicePipe } from '@angular/common';
import { MessageComponent } from '../message/message.component';
import { ToolbarService } from '../toolbar.service';
import { MessageService } from '../message.service';
import { Episode, EpisodeService } from '../episode.service';
import { Subscription } from 'rxjs';
import { MatIcon } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
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
  MatTableModule,
} from '@angular/material/table';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
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

@Component({
  selector: 'app-episodes-list',
  standalone: true,
  imports: [
    MatPaginatorModule,
    MatTableModule,
    MatSortModule,
    MatLabel,
    MatCard,
    MatCardHeader,
    RouterLink,
    MatLine,
    SlicePipe,
    DatePipe,
    MatTable,
    MatSort,
    MatColumnDef,
    MatHeaderCell,
    MatCell,
    MatCellDef,
    MatHeaderCellDef,
    MatHeaderRowDef,
    MatRow,
    MatHeaderRow,
    MatRowDef,
    MatPaginator,
    MessageComponent,
    MatFormField,
    MatSelect,
    MatOption,
    MatCardContent,
    MatMenu,
    MatMenuTrigger,
    MatIcon,
    SvgIconComponent,
    MatCheckboxModule,
    MatProgressBarModule,
    MatMenuItem,
    MatPrefix,
    MatIconButton,
    MatIconButton,
    MatButton,
    MatInput,
  ],
  templateUrl: './episodes-list.component.html',
  styleUrl: './episodes-list.component.scss',
})
export class EpisodesListComponent implements OnInit, OnDestroy {
  private subscriptions = new Subscription();
  episodes: Episode[] = [];
  dataSource = new MatTableDataSource(this.episodes);
  displayedColumns: string[] = ['title', 'podcast', 'actions'];
  totalEpisodes = 0;
  pageSize = 10;
  sortDirection = 'DESC';
  sortActive = 'date';
  loadingEpisodes = false;
  loadingPodcasts = false;
  selectedPodcast: string | null = null;
  podcasts: PodcastsResult[] = [];
  cursors: (string | null)[] = [null];
  isGridView = false;
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
  ) {}

  ngOnInit(): void {
    const viewContainerRef = this.toolbarService.getViewContainerRef();
    viewContainerRef.clear();
    viewContainerRef.createEmbeddedView(this.toolbarTemplate);
    this.loadEpisodes();
    this.loadPodcasts();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  toggleView(isGrid: boolean) {
    this.isGridView = isGrid;
  }

  loadEpisodes(after: string | null = null, pageIndex = 0) {
    this.loadingEpisodes = true;

    this.subscriptions.add(
      this.episodeService
        .getEpisodes(this.pageSize, after, this.sortActive, this.sortDirection, this.selectedPodcast)
        .subscribe({
          next: ({ episodes, pageInfo }) => {
            this.episodes = episodes;
            this.dataSource.data = episodes;
            this.cursors[pageIndex + 1] = pageInfo.endCursor ?? null;
            this.totalEpisodes = pageInfo.hasNextPage
              ? (pageIndex + 2) * this.pageSize
              : (pageIndex + 1) * this.pageSize;
            this.loadingEpisodes = false;
          },
          error: (err) => {
            this.messageService.error('Failed to load episodes: ' + err);
            this.loadingEpisodes = false;
          },
        }),
    );
  }

  loadPodcasts() {
    this.loadingPodcasts = true;

    this.subscriptions.add(
      this.podcastsService.getPodcasts().subscribe({
        next: (response) => {
          this.podcasts = response.podcasts;
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
    this.router.navigate(['/episode', uuid]);
  }

  deleteEpisode(episode: Episode) {
    if (episode.isLive && episode.podcast) {
      this.messageService.error(
        'Cannot delete episode that is currently live on podcast. Please unpublish the episode first.',
      );
      return;
    }

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
}
