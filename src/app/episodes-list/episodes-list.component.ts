// Copyright (c) 2025 Perpetuator LLC
import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { MatCard, MatCardContent } from '@angular/material/card';
import { Router, RouterLink } from '@angular/router';
import { MatLine, MatOption } from '@angular/material/core';
import { DatePipe, SlicePipe } from '@angular/common';
import { MessageComponent } from '../message/message.component';
import { ToolbarService } from '../toolbar.service';
import { MessageService } from '../message.service';
import { Episode, EpisodeService } from '../episode.service';
import { Subscription } from 'rxjs';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
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
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';
import { PodcastsService } from '../podcasts.service';
import { PodcastsResult } from '../podcasts-list/podcasts-list.component';

@Component({
  selector: 'app-episodes-list',
  standalone: true,
  imports: [
    MatPaginatorModule,
    MatTableModule,
    MatSortModule,
    MatLabel,
    MatCard,
    RouterLink,
    MatLine,
    SlicePipe,
    DatePipe,
    MatProgressSpinner,
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
  ],
  templateUrl: './episodes-list.component.html',
  styleUrl: './episodes-list.component.scss',
})
export class EpisodesListComponent implements OnInit, OnDestroy {
  private subscriptions = new Subscription();
  episodes: Episode[] = [];
  dataSource = new MatTableDataSource(this.episodes);
  displayedColumns: string[] = ['date', 'title', 'podcast'];
  totalEpisodes = 0;
  pageSize = 10;
  currentPage = 0;
  sortDirection = 'DESC';
  sortActive = 'date';
  loadingEpisodes = false;
  loadingPodcasts = false;
  selectedPodcast: string | null = null;
  podcasts: PodcastsResult[] = [];

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;

  constructor(
    private router: Router,
    private messageService: MessageService,
    private toolbarService: ToolbarService,
    private episodeService: EpisodeService,
    private podcastsService: PodcastsService,
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

  loadEpisodes() {
    this.loadingEpisodes = true;
    this.subscriptions.add(
      this.episodeService
        .episodes(this.currentPage + 1, this.pageSize, this.sortActive, this.sortDirection, this.selectedPodcast)
        .subscribe({
          next: (data) => {
            this.episodes = data.episodes;
            this.dataSource.data = this.episodes;
            this.totalEpisodes = data.totalRecords;
            this.loadingEpisodes = false;
          },
          error: (error) => {
            this.messageService.error('Failed to load episodes: ' + error.toString());
            this.loadingEpisodes = false;
          },
        }),
    );
  }

  loadPodcasts() {
    this.loadingPodcasts = true;

    this.subscriptions.add(
      this.podcastsService.getPodcasts().subscribe({
        next: (podcasts: PodcastsResult[]) => {
          this.podcasts = podcasts;
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
    this.sortDirection = sortState.direction.toUpperCase();
    this.sortActive = sortState.active;
    this.loadEpisodes();
  }

  onPageChange(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.currentPage = event.pageIndex;
    this.loadEpisodes();
  }

  viewEpisode(id: string) {
    this.router.navigate(['/episode', id]);
  }
}
