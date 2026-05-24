// Copyright (c) 2026 Perpetuator LLC
import { Component, OnDestroy, OnInit, inject, SecurityContext } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subscription, debounceTime, filter, switchMap } from 'rxjs';
import { marked } from 'marked';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { BlogsService, Article } from '../blogs.service';
import { MessageService } from '../../message.service';
import { ShareService } from '../../share.service';
import { ShareButtonsComponent } from '../../share-buttons/share-buttons.component';
import { ConfirmationDialogComponent } from '../../confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-article-detail',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    MatMenuModule,
    MatTabsModule,
    MatCheckboxModule,
    CdkTextareaAutosize,
    ShareButtonsComponent,
  ],
  templateUrl: './article-detail.component.html',
  styleUrl: './article-detail.component.scss',
})
export class ArticleDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly blogsService = inject(BlogsService);
  private readonly messageService = inject(MessageService);
  private readonly shareService = inject(ShareService);
  private readonly fb = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);
  private readonly sanitizer = inject(DomSanitizer);
  private subscriptions = new Subscription();

  loading = true;
  saving = false;
  publishing = false;
  articleUuid = '';
  article: Article | null = null;

  articleForm!: FormGroup;
  selectedTabIndex = 0;

  statusOptions = [
    { value: 'DRAFT', label: 'Draft' },
    { value: 'REVIEW', label: 'In Review' },
    { value: 'PUBLISHED', label: 'Published' },
    { value: 'ARCHIVED', label: 'Archived' },
  ];

  ngOnInit(): void {
    this.initForm();

    this.subscriptions.add(
      this.route.paramMap
        .pipe(
          filter((params) => params.has('uuid')),
          switchMap((params) => {
            this.articleUuid = params.get('uuid')!;
            this.loading = true;
            return this.blogsService.getArticle(this.articleUuid);
          }),
        )
        .subscribe({
          next: (article) => {
            this.article = article;
            this.patchForm(article);
            this.loading = false;
          },
          error: (err) => {
            this.messageService.error('Failed to load article: ' + err.message);
            this.loading = false;
          },
        }),
    );

    // Auto-save on form changes (except content which is large)
    this.subscriptions.add(
      this.articleForm.valueChanges
        .pipe(
          debounceTime(2000),
          filter(() => this.articleForm.dirty && this.articleForm.valid),
        )
        .subscribe(() => this.saveArticle()),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private initForm(): void {
    this.articleForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(200)]],
      slug: ['', Validators.maxLength(200)],
      subtitle: ['', Validators.maxLength(300)],
      description: ['', Validators.maxLength(500)],
      excerpt: ['', Validators.maxLength(500)],
      content: ['', Validators.required],
      status: ['DRAFT'],
      isFeatured: [false],
    });
  }

  private patchForm(article: Article): void {
    this.articleForm.patchValue({
      title: article.title,
      slug: article.slug || '',
      subtitle: article.subtitle || '',
      description: article.description || '',
      excerpt: article.excerpt || '',
      content: article.content || '',
      status: article.status,
      isFeatured: article.isFeatured,
    });
    this.articleForm.markAsPristine();
  }

  saveArticle(): void {
    if (!this.article || this.saving) return;

    this.saving = true;
    const formValue = this.articleForm.value;

    this.subscriptions.add(
      this.blogsService
        .updateArticle(this.article.id, {
          title: formValue.title,
          slug: formValue.slug || undefined,
          subtitle: formValue.subtitle || undefined,
          description: formValue.description || undefined,
          excerpt: formValue.excerpt || undefined,
          content: formValue.content,
          status: formValue.status,
          isFeatured: formValue.isFeatured,
        })
        .subscribe({
          next: (result) => {
            if (result.success) {
              this.articleForm.markAsPristine();
              this.messageService.info('Article saved');
            } else {
              this.messageService.error('Failed to save: ' + (result.errors?.join(', ') || 'Unknown error'));
            }
            this.saving = false;
          },
          error: (err) => {
            this.messageService.error('Failed to save: ' + err.message);
            this.saving = false;
          },
        }),
    );
  }

  publishArticle(): void {
    if (!this.article || this.publishing) return;

    this.publishing = true;
    this.subscriptions.add(
      this.blogsService.publishArticle(this.article.id).subscribe({
        next: (result) => {
          if (result.success) {
            this.messageService.info('Article published');
            if (this.article) {
              this.article.status = 'PUBLISHED';
              this.article.publishedAt = new Date().toISOString();
              this.articleForm.patchValue({ status: 'PUBLISHED' });
              this.articleForm.markAsPristine();
            }
          } else {
            this.messageService.error('Failed to publish article');
          }
          this.publishing = false;
        },
        error: (err) => {
          this.messageService.error('Failed to publish: ' + err.message);
          this.publishing = false;
        },
      }),
    );
  }

  unpublishArticle(): void {
    if (!this.article) return;

    this.subscriptions.add(
      this.blogsService.unpublishArticle(this.article.id).subscribe({
        next: (result) => {
          if (result.success) {
            this.messageService.info('Article unpublished');
            if (this.article) {
              this.article.status = 'DRAFT';
              this.article.publishedAt = null;
              this.articleForm.patchValue({ status: 'DRAFT' });
              this.articleForm.markAsPristine();
            }
          } else {
            this.messageService.error('Failed to unpublish article');
          }
        },
        error: (err) => {
          this.messageService.error('Failed to unpublish: ' + err.message);
        },
      }),
    );
  }

  deleteArticle(): void {
    if (!this.article) return;

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Delete Article',
        message: `Are you sure you want to delete "${this.article.title}"?`,
        confirmText: 'Delete',
        confirmColor: 'warn',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed && this.article) {
        this.subscriptions.add(
          this.blogsService.deleteArticle(this.article.id).subscribe({
            next: (result) => {
              if (result.success) {
                this.messageService.info('Article deleted');
                this.router.navigate(['/media/articles']);
              } else {
                this.messageService.error('Failed to delete article');
              }
            },
            error: (err) => {
              this.messageService.error('Failed to delete article: ' + err.message);
            },
          }),
        );
      }
    });
  }

  /**
   * Pre-computed status class for the loaded article. Updated when `article`
   * is set so the template can read it as property access.
   */
  get articleStatusClass(): string {
    return this.article ? this.getStatusClass(this.article.status) : '';
  }

  /** Pre-formatted publishedAt / createdAt for the loaded article. */
  get articlePublishedAt(): string {
    return this.formatDate(this.article?.publishedAt ?? null);
  }
  get articleCreatedAt(): string {
    return this.formatDate(this.article?.createdAt ?? null);
  }

  get hasUnsavedChangesGetter(): boolean {
    return this.articleForm.dirty;
  }

  get shareUrl(): string {
    if (!this.article) return '';
    return this.shareService.buildArticleUrl(this.article.id, this.article.title);
  }

  get shareRoute(): string {
    if (!this.article) return '';
    return this.shareService.buildArticleRoute(this.article.id, this.article.title);
  }

  /** Pre-rendered preview HTML for the current content form value. */
  get previewHtml(): SafeHtml {
    return this.renderMarkdown(this.articleForm.get('content')?.value);
  }

  /** Subtitle form value, or empty string. Empty hides the preview `<h2>`. */
  get previewSubtitle(): string {
    return this.articleForm.get('subtitle')?.value || '';
  }

  /** Router path to the article's blog, or empty path when no blog. */
  get blogLinkPath(): string[] {
    return this.article?.blog ? ['/media/blogs', this.article.blog.id] : [];
  }

  /**
   * Pre-computed meta items for the preview pane (blog name, created
   * date, read time, with bullet separators only between present items).
   * Eliminates per-tick `@if`s in the template.
   */
  get previewMetaItems(): { label: string; isSeparator: boolean }[] {
    const items: { label: string; isSeparator: boolean }[] = [];
    const push = (label: string) => {
      if (items.length > 0) items.push({ label: '•', isSeparator: true });
      items.push({ label, isSeparator: false });
    };
    if (this.article?.blog) push(this.article.blog.name);
    push(this.articleCreatedAt);
    if (this.article?.readTimeMinutes) push(`${this.article.readTimeMinutes} min read`);
    return items;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PUBLISHED':
        return 'status-success';
      case 'DRAFT':
        return 'status-draft';
      case 'REVIEW':
        return 'status-review';
      case 'ARCHIVED':
        return 'status-archived';
      default:
        return '';
    }
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  }

  goBack(): void {
    if (this.article?.blog?.id) {
      this.router.navigate(['/media/blogs', this.article.blog.id]);
    } else {
      this.router.navigate(['/media/articles']);
    }
  }

  hasUnsavedChanges(): boolean {
    return this.articleForm.dirty;
  }

  renderMarkdown(markdown: string | undefined | null): SafeHtml {
    if (!markdown) return '';
    const html = marked.parse(markdown, { async: false }) as string;
    // Sanitize the HTML to prevent XSS
    const sanitized = this.sanitizer.sanitize(SecurityContext.HTML, html) || '';
    return this.sanitizer.bypassSecurityTrustHtml(sanitized);
  }

  getShareUrl(): string {
    if (!this.article) return '';
    return this.shareService.buildArticleUrl(this.article.id, this.article.title);
  }

  getShareRoute(): string {
    if (!this.article) return '';
    return this.shareService.buildArticleRoute(this.article.id, this.article.title);
  }
}
