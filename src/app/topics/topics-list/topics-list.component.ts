// Copyright (c) 2025 Perpetuator LLC
import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { ToolbarService } from '../../toolbar.service';
import { MessageService } from '../../message.service';
import { ResearchService, Topic } from '../research.service';
import { Subscription } from 'rxjs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButton, MatButtonModule } from '@angular/material/button';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { CreateTopicDialogComponent } from '../create-topic-dialog/create-topic-dialog.component';
import { PodcastsService, PodcastsResult } from '../../podcast/podcasts.service';
import { LoadingService } from '../../loading.service';

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
  ],
  templateUrl: './topics-list.component.html',
  styleUrls: ['./topics-list.component.scss'],
})
export class TopicsListComponent implements OnInit, OnDestroy {
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;
  private subscriptions = new Subscription();
  protected loading = false;
  dataSource = new MatTableDataSource<Topic>([]);
  displayedColumns: string[] = ['title', 'podcast', 'created', 'status', 'actions'];
  topics: Topic[] = [];
  podcasts: PodcastsResult[] = [];
  private shouldOpenCreateDialog = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private messageService: MessageService,
    private toolbarService: ToolbarService,
    private researchService: ResearchService,
    private podcastsService: PodcastsService,
    private dialog: MatDialog,
    private loadingService: LoadingService,
  ) {}

  ngOnInit(): void {
    this.messageService.clearMessages();
    const viewContainerRef = this.toolbarService.getViewContainerRef();
    viewContainerRef.clear();
    viewContainerRef.createEmbeddedView(this.toolbarTemplate);

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

  loadTopics(): void {
    this.loading = true;
    this.loadingService.show();
    this.subscriptions.add(
      this.researchService.getTopics(undefined, 50).subscribe({
        next: (response) => {
          this.messageService.clearMessages();
          this.topics = response.topics;
          this.dataSource = new MatTableDataSource(this.topics);
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

  viewTopic(uuid: string) {
    this.router.navigate(['/topic', uuid]);
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
