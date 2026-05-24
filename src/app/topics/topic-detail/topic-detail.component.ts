// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, OnDestroy, OnInit, TemplateRef, ViewChild, inject } from '@angular/core';
import { MatCard, MatCardContent, MatCardHeader } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToolbarService } from '../../layout/toolbar.service';
import { MessageService } from '../../message.service';
import { ResearchService, Topic } from '../research.service';
import { Subscription } from 'rxjs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatButton } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { JobService } from '../../jobs/job.service';
import { LoadingService } from '../../layout/loading.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-topic-detail',
  standalone: true,
  imports: [
    MatButton,
    MatCard,
    MatCardHeader,
    MatIcon,

    MatProgressBarModule,
    MatProgressSpinner,
    MatCardContent,
    CommonModule,
    MatTabsModule,
    MatChipsModule,
    RouterLink,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './topic-detail.component.html',
  styleUrls: ['./topic-detail.component.scss'],
})
export class TopicDetailComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private messageService = inject(MessageService);
  private toolbarService = inject(ToolbarService);
  private researchService = inject(ResearchService);
  private jobService = inject(JobService);
  private loadingService = inject(LoadingService);
  private sanitizer = inject(DomSanitizer);

  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;
  private subscriptions = new Subscription();
  protected loading = false;
  topic: Topic | null = null;
  /** Pre-rendered display strings for the loaded topic. */
  topicDisplay: {
    formattedCreatedAt: string;
    validatedContentHtml: SafeHtml;
    researchContentHtml: SafeHtml;
    sources: {
      uuid: string;
      createdAt: string;
      formattedDate: string;
      url: string;
      title?: string | null;
      content?: string | null;
    }[];
  } | null = null;

  private rebuildTopicDisplay(): void {
    const t = this.topic;
    if (!t) {
      this.topicDisplay = null;
      return;
    }
    this.topicDisplay = {
      formattedCreatedAt: this.formatDate(t.createdAt),
      validatedContentHtml: this.markdownToHtml(t.validatedContent ?? ''),
      researchContentHtml: this.markdownToHtml(t.researchContent ?? ''),
      sources: (t.sources ?? []).map((s) => ({
        ...s,
        formattedDate: this.formatDate(s.createdAt),
      })),
    };
  }

  topicUuid: string | null = null;
  isGeneratingResearch = false;

  // Editing state
  isEditing = false;
  isSaving = false;
  editTitle = '';
  editDescription = '';

  ngOnInit(): void {
    this.messageService.clearMessages();
    this.toolbarService.setToolbarTemplate(this.toolbarTemplate);

    this.topicUuid = this.route.snapshot.paramMap.get('uuid');
    if (this.topicUuid) {
      this.loadTopic();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.loadingService.hide();
  }

  loadTopic(): void {
    if (!this.topicUuid) {
      this.messageService.error('No topic ID provided');
      return;
    }

    this.loading = true;
    this.loadingService.show();
    this.subscriptions.add(
      this.researchService.getTopicById(this.topicUuid).subscribe({
        next: (topic) => {
          this.messageService.clearMessages();
          this.topic = topic;
          this.rebuildTopicDisplay();
          this.loading = false;
          this.loadingService.hide();
        },
        error: (err) => {
          this.loading = false;
          this.loadingService.hide();
          this.messageService.error(`Failed to fetch topic: ${err.message}`);
        },
        complete: () => {
          this.loading = false;
          this.loadingService.hide();
        },
      }),
    );
  }

  goBack(): void {
    this.router.navigate(['/media/topics']);
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

  markdownToHtml(markdown: string): SafeHtml {
    const html = marked.parse(markdown, { async: false }) as string;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  startEditing(): void {
    if (!this.topic) return;
    this.isEditing = true;
    this.editTitle = this.topic.title;
    this.editDescription = this.topic.description || '';
  }

  cancelEditing(): void {
    this.isEditing = false;
    this.editTitle = '';
    this.editDescription = '';
  }

  saveChanges(): void {
    if (!this.topic || !this.topicUuid || this.isSaving) return;

    const trimmedTitle = this.editTitle.trim();
    if (!trimmedTitle) {
      this.messageService.error('Title is required');
      return;
    }

    this.isSaving = true;
    this.messageService.clearMessages();

    const updates: { title?: string; description?: string } = {};

    if (trimmedTitle !== this.topic.title) {
      updates.title = trimmedTitle;
    }

    const trimmedDescription = this.editDescription.trim();
    if (trimmedDescription !== (this.topic.description || '')) {
      updates.description = trimmedDescription || undefined;
    }

    if (Object.keys(updates).length === 0) {
      this.messageService.info('No changes to save');
      this.isEditing = false;
      this.isSaving = false;
      return;
    }

    this.subscriptions.add(
      this.researchService.updateTopic(this.topicUuid, updates).subscribe({
        next: (response) => {
          this.messageService.success('Topic updated successfully');
          if (response.topic) {
            this.topic = { ...this.topic!, ...response.topic };
            this.rebuildTopicDisplay();
          }
          this.isEditing = false;
          this.isSaving = false;
        },
        error: (err: { message: string }) => {
          this.messageService.error(`Failed to update topic: ${err.message}`);
          this.isSaving = false;
        },
      }),
    );
  }
}
