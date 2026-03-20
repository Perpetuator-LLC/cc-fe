// Copyright (c) 2026 Perpetuator LLC
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { Subscription } from 'rxjs';
import { SocialAccount, SocialsService, BroadcastTemplate } from '../../socials/socials.service';
import { Blog, BlogsService } from '../../blogs/blogs.service';
import { MessageService } from '../../message.service';
import { JobService } from '../../jobs/job.service';

export interface GenerateContentDialogData {
  episodeUuid: string;
  episodeTitle: string;
  episodeContent: string;
}

export interface GenerateContentDialogResult {
  type: 'social' | 'article';
  success: boolean;
}

@Component({
  selector: 'app-generate-content-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatTabsModule,
  ],
  templateUrl: './generate-content-dialog.component.html',
  styleUrl: './generate-content-dialog.component.scss',
})
export class GenerateContentDialogComponent implements OnInit, OnDestroy {
  private readonly dialogRef = inject(MatDialogRef<GenerateContentDialogComponent>);
  readonly data = inject<GenerateContentDialogData>(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);
  private readonly socialsService = inject(SocialsService);
  private readonly blogsService = inject(BlogsService);
  private readonly messageService = inject(MessageService);
  private readonly jobService = inject(JobService);

  private subscriptions = new Subscription();

  socialForm: FormGroup;
  articleForm: FormGroup;

  socialAccounts: SocialAccount[] = [];
  templates: BroadcastTemplate[] = [];
  blogs: Blog[] = [];

  loadingAccounts = true;
  loadingBlogs = true;
  generatingSocial = false;
  creatingArticle = false;

  selectedTabIndex = 0;

  constructor() {
    this.socialForm = this.fb.group({
      socialAccountUuid: ['', Validators.required],
      templateUuid: [''],
    });

    this.articleForm = this.fb.group({
      blogUuid: ['', Validators.required],
      title: [this.data.episodeTitle, Validators.required],
      content: [this.data.episodeContent, Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadSocialAccounts();
    this.loadBlogs();
    this.loadTemplates();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private loadSocialAccounts(): void {
    this.loadingAccounts = true;
    this.subscriptions.add(
      this.socialsService.getSocialAccounts(undefined, undefined, true).subscribe({
        next: (accounts) => {
          this.socialAccounts = accounts;
          this.loadingAccounts = false;
        },
        error: (err) => {
          this.messageService.error(`Failed to load social accounts: ${err.message}`);
          this.loadingAccounts = false;
        },
      }),
    );
  }

  private loadBlogs(): void {
    this.loadingBlogs = true;
    this.subscriptions.add(
      this.blogsService.getBlogs().subscribe({
        next: (blogs) => {
          this.blogs = blogs;
          this.loadingBlogs = false;
        },
        error: (err) => {
          this.messageService.error(`Failed to load blogs: ${err.message}`);
          this.loadingBlogs = false;
        },
      }),
    );
  }

  private loadTemplates(): void {
    this.subscriptions.add(
      this.socialsService.getBroadcastTemplates().subscribe({
        next: (templates) => {
          this.templates = templates;
        },
        error: () => {
          // Templates are optional, don't show error
        },
      }),
    );
  }

  getPlatformIcon(platform: string): string {
    const icons: Record<string, string> = {
      TWITTER: 'alternate_email',
      LINKEDIN: 'work',
      FACEBOOK: 'facebook',
      INSTAGRAM: 'photo_camera',
      TIKTOK: 'music_note',
      YOUTUBE: 'play_circle',
      THREADS: 'forum',
      BLUESKY: 'cloud',
    };
    return icons[platform] || 'share';
  }

  generateSocialPost(): void {
    if (this.socialForm.invalid || this.generatingSocial) {
      return;
    }

    this.generatingSocial = true;
    const { socialAccountUuid, templateUuid } = this.socialForm.value;

    this.subscriptions.add(
      this.socialsService
        .generateBroadcastFromSource(socialAccountUuid, 'episode', this.data.episodeUuid, templateUuid || undefined)
        .subscribe({
          next: (result) => {
            this.generatingSocial = false;
            if (result.success && result.job) {
              // Construct a full Job object for the job service
              this.jobService.addJob({
                id: result.job.id,
                uuid: result.job.id,
                kind: 'GENERATE_BROADCAST',
                status: result.job.status || 'RUNNING',
                error: '',
                result: null,
                args: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
              this.messageService.success('Social post generation started!');
              this.dialogRef.close({ type: 'social', success: true } as GenerateContentDialogResult);
            } else {
              this.messageService.error(result.message || 'Failed to generate social post');
            }
          },
          error: (err) => {
            this.generatingSocial = false;
            this.messageService.error(`Failed to generate social post: ${err.message}`);
          },
        }),
    );
  }

  createArticle(): void {
    if (this.articleForm.invalid || this.creatingArticle) {
      return;
    }

    this.creatingArticle = true;
    const { blogUuid, title, content } = this.articleForm.value;

    this.subscriptions.add(
      this.blogsService.createArticle(blogUuid, title, content).subscribe({
        next: (result) => {
          this.creatingArticle = false;
          if (result.success) {
            this.messageService.success('Article created successfully!');
            this.dialogRef.close({ type: 'article', success: true } as GenerateContentDialogResult);
          } else {
            this.messageService.error('Failed to create article');
          }
        },
        error: (err) => {
          this.creatingArticle = false;
          this.messageService.error(`Failed to create article: ${err.message}`);
        },
      }),
    );
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  getSelectedAccountTemplates(): BroadcastTemplate[] {
    const selectedAccount = this.socialAccounts.find((a) => a.id === this.socialForm.value.socialAccountUuid);
    if (!selectedAccount) return [];
    return this.templates.filter((t) => t.platform === selectedAccount.platform);
  }
}
