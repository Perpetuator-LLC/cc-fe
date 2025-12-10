// Copyright (c) 2025 Perpetuator LLC
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { MessageService } from '../../message.service';
import { ResearchService, Topic, GetTopicsResult } from '../research.service';
import { Subscription } from 'rxjs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButton, MatButtonModule } from '@angular/material/button';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { CreateTopicDialogComponent } from '../create-topic-dialog/create-topic-dialog.component';
import { PodcastsService, PodcastsResult } from '../../podcast/podcasts.service';
import { LoadingService } from '../../layout/loading.service';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { PageInfo } from '../../utils/relay';

@Component({
  selector: 'app-topics-list',
  standalone: true,
  imports: [
    MatButton,
    MatCard,
    MatIcon,
    MatProgressBarModule,
    MatCardContent,
    MatTableModule,
    RouterLink,
    MatButtonModule,
    CommonModule,
    MatPaginatorModule,
  ],
  templateUrl: './topics-list.component.html',
  styleUrls: ['./topics-list.component.scss'],
})
export class TopicsListComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  private subscriptions = new Subscription();
  protected loading = false;
  dataSource = new MatTableDataSource<Topic>([]);
  displayedColumns: string[] = ['title', 'podcast', 'created', 'status'];
  topics: Topic[] = [];
  podcasts: PodcastsResult[] = [];
  private shouldOpenCreateDialog = false;

  // Pagination state
  pageSize = 10;
  pageIndex = 0;
  totalCount = 0;
  private pageInfo: PageInfo | null = null;
  private cursorStack: (string | null)[] = [null]; // Stack of cursors for previous pages

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private messageService: MessageService,
    private researchService: ResearchService,
    private podcastsService: PodcastsService,
    private dialog: MatDialog,
    private loadingService: LoadingService,
  ) {}

  ngOnInit(): void {
    this.messageService.clearMessages();

    // Check for query parameter to auto-open create dialog
    this.subscriptions.add(
      this.route.queryParams.subscribe((params) => {
        if (params['create'] === 'true') {
          // Remove the query parameter from URL
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {},
            replaceUrl: true,
          });
          // Set flag to open dialog after podcasts load
          this.shouldOpenCreateDialog = true;
        }
      }),
    );

    this.loadPodcasts();
    this.loadTopics();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.loadingService.hide();
  }

  loadPodcasts(): void {
    this.subscriptions.add(
      this.podcastsService.getPodcastsForFilter().subscribe({
        next: (response) => {
          this.podcasts = response.podcasts;
          // If create dialog should open, open it now that podcasts are loaded
          if (this.shouldOpenCreateDialog) {
            this.shouldOpenCreateDialog = false;
            setTimeout(() => this.createTopic(), 0);
          }
        },
        error: (err: { message: string }) => {
          this.messageService.error(`Failed to load podcasts: ${err.message}`);
        },
      }),
    );
  }

  loadTopics(after: string | null = null): void {
    this.loading = true;
    this.loadingService.show();
    this.subscriptions.add(
      this.researchService.getTopics(undefined, this.pageSize, after).subscribe({
        next: (response: GetTopicsResult) => {
          this.messageService.clearMessages();
          this.topics = response.topics;
          this.pageInfo = response.pageInfo;
          this.dataSource = new MatTableDataSource(this.topics);
          // Estimate total count based on current page and hasNextPage
          // This is an approximation since GraphQL relay doesn't provide total count
          if (this.pageInfo.hasNextPage) {
            this.totalCount = Math.max(this.totalCount, (this.pageIndex + 2) * this.pageSize);
          } else {
            this.totalCount = this.pageIndex * this.pageSize + this.topics.length;
          }
          this.loading = false;
          this.loadingService.hide();
        },
        error: (err: { message: string }) => {
          this.loading = false;
          this.loadingService.hide();
          this.messageService.clearMessages();
          this.messageService.error(`Failed to retrieve topics data: ${err.message}`);
        },
        complete: () => {
          this.loading = false;
          this.loadingService.hide();
        },
      }),
    );
  }

  onPageChange(event: PageEvent): void {
    const previousPageIndex = this.pageIndex;
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;

    if (event.pageIndex > previousPageIndex) {
      // Going forward - use endCursor from current page
      if (this.pageInfo?.endCursor) {
        this.cursorStack.push(this.pageInfo.endCursor);
        this.loadTopics(this.pageInfo.endCursor);
      }
    } else if (event.pageIndex < previousPageIndex) {
      // Going backward - pop the stack and use previous cursor
      this.cursorStack.pop();
      const cursor = this.cursorStack[this.cursorStack.length - 1] || null;
      this.loadTopics(cursor);
    } else {
      // Page size changed - reload from start
      this.pageIndex = 0;
      this.cursorStack = [null];
      this.loadTopics(null);
    }
  }

  viewTopic(uuid: string) {
    this.router.navigate(['/media/topics', uuid]);
  }

  getTopicStatus(topic: Topic): string {
    if (topic.transcript) return 'Complete';
    if (topic.validatedContent) return 'Validated';
    if (topic.researchContent) return 'Researched';
    return 'Not Started';
  }

  getStatusClass(topic: Topic): string {
    const status = this.getTopicStatus(topic);
    if (status === 'Complete') return 'status-complete';
    if (status === 'Validated') return 'status-validated';
    if (status === 'Researched') return 'status-researched';
    return 'status-progress';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  createTopic(): void {
    if (this.podcasts.length === 0) {
      this.messageService.error('No podcasts available. Please create a podcast first.');
      return;
    }

    const dialogRef = this.dialog.open(CreateTopicDialogComponent, {
      width: '500px',
      data: {
        podcasts: this.podcasts.map((p) => ({ uuid: p.uuid, name: p.name || 'Unnamed Podcast' })),
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadTopics();
      }
    });
  }
}
