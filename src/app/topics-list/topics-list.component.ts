// Copyright (c) 2025 Perpetuator LLC
import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import { MessageComponent } from '../message/message.component';
import { ToolbarService } from '../toolbar.service';
import { MessageService } from '../message.service';
import { ResearchService, Topic } from '../research.service';
import { Subscription } from 'rxjs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButton, MatButtonModule } from '@angular/material/button';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { CreateTopicDialogComponent } from '../create-topic-dialog/create-topic-dialog.component';
import { PodcastsService, PodcastsResult } from '../podcasts.service';

@Component({
  selector: 'app-topics-list',
  standalone: true,
  imports: [
    MatButton,
    MatCard,
    MatIcon,
    MessageComponent,
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
  selectedPodcastUuid: string | null = null;

  constructor(
    private router: Router,
    private messageService: MessageService,
    private toolbarService: ToolbarService,
    private researchService: ResearchService,
    private podcastsService: PodcastsService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.messageService.clearMessages();
    const viewContainerRef = this.toolbarService.getViewContainerRef();
    viewContainerRef.clear();
    viewContainerRef.createEmbeddedView(this.toolbarTemplate);
    this.loadPodcasts();
    this.loadTopics();
  }

  loadPodcasts(): void {
    this.subscriptions.add(
      this.podcastsService.getPodcasts().subscribe({
        next: (response) => {
          this.podcasts = response.podcasts;
        },
        error: (err: { message: string }) => {
          this.messageService.error(`Failed to load podcasts: ${err.message}`);
        },
      }),
    );
  }

  loadTopics(): void {
    this.loading = true;
    this.subscriptions.add(
      this.researchService.getTopics(undefined, 50).subscribe({
        next: (response) => {
          this.messageService.clearMessages();
          this.topics = response.topics;
          this.dataSource = new MatTableDataSource(this.topics);
          this.loading = false;
        },
        error: (err: { message: string }) => {
          this.loading = false;
          this.messageService.clearMessages();
          this.messageService.addMessage({
            type: 'error',
            text: `Failed to retrieve research topics: ${err.message}`,
            dismissible: true,
          });
        },
        complete: () => {
          this.loading = false;
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
    return 'In Progress';
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

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.toolbarService.clearToolbarComponent();
  }
}
