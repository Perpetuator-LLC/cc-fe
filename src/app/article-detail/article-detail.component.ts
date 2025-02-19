// Copyright (c) 2025 Perpetuator LLC
import { Component, OnInit, TemplateRef, ViewChild, OnDestroy } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Article, ArticleService } from '../article.service';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MessageService } from '../message.service';
import { ToolbarService } from '../toolbar.service';
import { MatList, MatListItem } from '@angular/material/list';
import { MessageComponent } from '../message/message.component';
import { JobStatusBarComponent } from '../job-status-bar/job-status-bar.component';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatDivider } from '@angular/material/divider';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatLine } from '@angular/material/core';
import { DatePipe } from '@angular/common';
import { MatTooltip } from '@angular/material/tooltip';
import { MatAnchor, MatButton } from '@angular/material/button';
import { MatInput } from '@angular/material/input';
import { Subscription } from 'rxjs';
import { Job, JobService, JobStatus, JobType, stringToJobType } from '../job.service';
import { MatIcon } from '@angular/material/icon';
import { MatCheckbox } from '@angular/material/checkbox';
import { toObservable } from '@angular/core/rxjs-interop';
import { FetchPolicy } from '@apollo/client';

@Component({
  selector: 'app-article-detail',
  standalone: true,
  imports: [
    FormsModule,
    MatListItem,
    MessageComponent,
    MatList,
    JobStatusBarComponent,
    MatCardContent,
    MatCard,
    MatDivider,
    MatLabel,
    MatFormField,
    MatLine,
    DatePipe,
    MatTooltip,
    MatButton,
    MatInput,
    MatIcon,
    MatCheckbox,
    ReactiveFormsModule,
    RouterLink,
    MatAnchor,
  ],
  templateUrl: './article-detail.component.html',
  styleUrl: './article-detail.component.scss',
})
export class ArticleDetailComponent implements OnInit, OnDestroy {
  private subscriptions: Subscription = new Subscription();
  articleForm: FormGroup;
  audioSrc: string | null = null;
  wordCount = 0;
  jobs: Job[] = [];

  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;
  @ViewChild(JobStatusBarComponent) jobStatusBar!: JobStatusBarComponent;
  private articleId: string;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private messageService: MessageService,
    private toolbarService: ToolbarService,
    private articleService: ArticleService,
    private jobService: JobService,
  ) {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      throw new Error('Failed to get Article ID from route.');
    }
    this.articleId = id;
    this.articleForm = this.fb.group({
      id: [{ value: '', disabled: true }, Validators.required],
      isLive: [false, Validators.required],
      title: ['', Validators.required],
      content: ['', Validators.required],
      date: ['', Validators.required],
      audioBase64: ['', Validators.required],
      podcastDate: ['', Validators.required],
      telegramDate: ['', Validators.required],
      newsSummaries: this.fb.array([
        this.fb.group({
          id: [{ value: '', disabled: true }],
          url: [{ value: '', disabled: true }],
          title: [{ value: '', disabled: true }],
        }),
      ]),
      team: this.fb.group({
        id: [{ value: '', disabled: true }],
        name: [{ value: '', disabled: true }],
      }),
    });
    this.subscriptions.add(
      toObservable(this.jobService.jobs).subscribe((jobs) => {
        this.jobService.getJobTransitions(jobs, this.jobs, JobStatus.COMPLETED).forEach((job) => {
          if ([JobType.UPDATE_ARTICLE_AUDIO].includes(stringToJobType(job.jobType))) {
            this.subscriptions.add(
              this.articleService.getArticleById(this.articleId, 'network-only' as FetchPolicy).subscribe({
                next: (article) => {
                  if (article.audioUrl) {
                    this.audioSrc = article.audioUrl;
                  }
                },
                error: (err) => {
                  this.messageService.error(`Failed to fetch updated audio for article: ${err.message}`);
                },
              }),
            );
          } else if ([JobType.CREATE_ARTICLE].includes(stringToJobType(job.jobType))) {
            const newArticleUrl = `/article/${job.result}`;
            this.messageService.success(`New article URL: <a href="${newArticleUrl}">${newArticleUrl}</a>`, null, true);
          }
        });
        this.jobs = jobs;
      }),
    );
  }

  ngOnInit(): void {
    const viewContainerRef = this.toolbarService.getViewContainerRef();
    viewContainerRef.clear();
    viewContainerRef.createEmbeddedView(this.toolbarTemplate);

    this.subscriptions.add(
      this.articleService.getArticleById(this.articleId).subscribe({
        next: (article) => {
          this.articleForm.patchValue(article);

          for (const newsSummary of article.newsSummaries) {
            (this.articleForm.get('newsSummaries') as FormArray).push(this.fb.group(newsSummary));
          }

          this.audioSrc = article.audioUrl;
        },
        error: (err) => {
          this.messageService.error(`Failed to fetch article: ${err.message}`);
        },
      }),
    );
    this.subscriptions.add(
      this.articleForm.get('content')?.valueChanges.subscribe((value: string) => {
        this.wordCount = this.countWords(value);
      }),
    );
  }

  private countWords(text: string): number {
    return text ? text.trim().split(/\s+/).length : 0;
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.toolbarService.clearToolbarComponent();
  }

  publishAudio(): void {
    this.messageService.info('Audio file publishing...');
    this.subscriptions.add(
      this.articleService.publishAudio(this.articleId).subscribe({
        next: (response) => {
          this.messageService.success('Audio file published successfully.');
          this.articleForm.patchValue(response.article);
        },
        error: (err) => {
          this.messageService.error(err.message);
        },
      }),
    );
  }

  onIsLiveChange(isLive: boolean) {
    this.articleForm.value.isLive = isLive;
    this.updateArticle();
  }

  downloadAudio(): void {
    if (this.audioSrc) {
      const a = document.createElement('a');
      a.href = this.audioSrc;
      a.download = `article_${this.articleId}.mp3`; // Set the download file name
      a.click(); // Programmatically trigger the download
    }
  }

  generateAudio(): void {
    this.subscriptions.add(
      this.articleService.generateAudio(this.articleId).subscribe({
        next: (data) => {
          if (!data.success) {
            this.messageService.error(data.message);
            return;
          }
          if (!data.job) {
            this.messageService.error('No job returned for audio generation.');
            return;
          }
          this.messageService.info('Generating audio file...');
          this.jobService.addJob(data.job);
        },
        error: (err) => {
          this.messageService.error(err.message);
        },
      }),
    );
  }

  updateArticle(): void {
    const formValues = this.articleForm.getRawValue() as Article;
    this.subscriptions.add(
      this.articleService
        .updateArticle(formValues.id, formValues.title, formValues.content, formValues.isLive)
        .subscribe({
          next: (response) => {
            if (!response.success) {
              this.messageService.error(response.message);
              return;
            }
            this.messageService.success('Article updated successfully.');
            this.articleForm.patchValue(response.article);
          },
          error: (err) => {
            this.messageService.error(err.message);
          },
        }),
    );
  }
}
