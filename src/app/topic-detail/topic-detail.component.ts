// Copyright (c) 2025 Perpetuator LLC
import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { MatCard, MatCardContent, MatCardHeader } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageComponent } from '../message/message.component';
import { ToolbarService } from '../toolbar.service';
import { MessageService } from '../message.service';
import { ResearchService, Topic } from '../research.service';
import { Subscription } from 'rxjs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatButton } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { JobService } from '../job.service';

@Component({
  selector: 'app-topic-detail',
  standalone: true,
  imports: [
    MatButton,
    MatCard,
    MatCardHeader,
    MatIcon,
    MessageComponent,
    MatProgressBarModule,
    MatProgressSpinner,
    MatCardContent,
    CommonModule,
    MatTabsModule,
    MatChipsModule,
  ],
  templateUrl: './topic-detail.component.html',
  styleUrls: ['./topic-detail.component.scss'],
})
export class TopicDetailComponent implements OnInit, OnDestroy {
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;
  private subscriptions = new Subscription();
  protected loading = false;
  topic: Topic | null = null;
  topicUuid: string | null = null;
  isGeneratingResearch = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private messageService: MessageService,
    private toolbarService: ToolbarService,
    private researchService: ResearchService,
    private jobService: JobService,
  ) {}

  ngOnInit(): void {
    this.messageService.clearMessages();
    const viewContainerRef = this.toolbarService.getViewContainerRef();
    viewContainerRef.clear();
    viewContainerRef.createEmbeddedView(this.toolbarTemplate);

    this.topicUuid = this.route.snapshot.paramMap.get('uuid');
    if (this.topicUuid) {
      this.loadTopic();
    }
  }

  loadTopic(): void {
    this.loading = true;
    this.subscriptions.add(
      this.researchService.getTopics(undefined, 100).subscribe({
        next: (response) => {
          this.messageService.clearMessages();
          this.topic = response.topics.find((t) => t.uuid === this.topicUuid) || null;
          if (!this.topic) {
            this.messageService.error('Topic not found');
          }
          this.loading = false;
        },
        error: (err: { message: string }) => {
          this.loading = false;
          this.messageService.error(`Failed to retrieve topic: ${err.message}`);
        },
        complete: () => {
          this.loading = false;
        },
      }),
    );
  }

  goBack(): void {
    this.router.navigate(['/topics']);
  }

  generateResearch(): void {
    if (!this.topic || this.isGeneratingResearch) {
      return;
    }

    this.isGeneratingResearch = true;
    this.messageService.clearMessages();
    this.messageService.info('Starting full research chain for this topic...', 0, false);

    this.subscriptions.add(
      this.researchService.createFullResearchChain(this.topic.podcast.uuid, this.topic.uuid).subscribe({
        next: (response) => {
          this.messageService.clearMessages();
          this.messageService.success(
            `Research generation started! ${response.jobs.length} job(s) created.`,
            5000,
            true,
          );
          this.jobService.addJobs(response.jobs);
          this.isGeneratingResearch = false;
          setTimeout(() => {
            this.loadTopic();
          }, 2000);
        },
        error: (err: { message: string }) => {
          this.isGeneratingResearch = false;
          this.messageService.error(`Failed to generate research: ${err.message}`);
        },
      }),
    );
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.toolbarService.clearToolbarComponent();
  }
}
