// Copyright (c) 2026 Perpetuator LLC
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';
import { BlogsService, Blog, Article } from '../blogs.service';
import { MessageService } from '../../message.service';
import { UserSettingsService } from '../../shared/services/user-settings.service';

export interface ArticleDialogData {
  article?: Article;
  blogUuid?: string;
}

@Component({
  selector: 'app-article-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './article-dialog.component.html',
  styleUrl: './article-dialog.component.scss',
})
export class ArticleDialogComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<ArticleDialogComponent>);
  private readonly data = inject<ArticleDialogData>(MAT_DIALOG_DATA);
  private readonly blogsService = inject(BlogsService);
  private readonly messageService = inject(MessageService);
  private readonly userSettingsService = inject(UserSettingsService);
  private subscriptions = new Subscription();

  form!: FormGroup;
  blogs: Blog[] = [];
  loading = false;
  loadingBlogs = true;
  isEdit = false;

  /** Pre-computed label for the primary save button. */
  get saveButtonLabel(): string {
    if (this.loading) return 'Saving...';
    return this.isEdit ? 'Update' : 'Create';
  }

  /** Dialog title text. */
  get dialogTitle(): string {
    return this.isEdit ? 'Edit Article' : 'Create Article';
  }

  ngOnInit(): void {
    this.isEdit = !!this.data?.article;
    this.initForm();
    this.loadBlogs();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private initForm(): void {
    const article = this.data?.article;
    this.form = this.fb.group({
      blogUuid: [this.data?.blogUuid || article?.blog?.id || '', Validators.required],
      title: [article?.title || '', [Validators.required, Validators.maxLength(200)]],
      subtitle: [article?.subtitle || '', Validators.maxLength(300)],
      content: [article?.content || '', Validators.required],
      description: [article?.description || '', Validators.maxLength(500)],
      slug: [article?.slug || ''],
    });
  }

  private loadBlogs(): void {
    this.loadingBlogs = true;
    this.subscriptions.add(
      this.blogsService.getBlogs().subscribe({
        next: (blogs) => {
          this.blogs = blogs;
          this.loadingBlogs = false;
          this.selectDefaultBlog();
        },
        error: (err) => {
          this.messageService.error('Failed to load blogs: ' + err.message);
          this.loadingBlogs = false;
        },
      }),
    );
  }

  /**
   * Auto-select blog based on: explicit param > last used > single blog fallback
   */
  private selectDefaultBlog(): void {
    // If blog was already set via data (editing or explicit param), don't override
    const currentBlogUuid = this.form.get('blogUuid')?.value;
    if (currentBlogUuid) return;

    // If only one blog, select it automatically
    if (this.blogs.length === 1) {
      this.form.patchValue({ blogUuid: this.blogs[0].id });
      return;
    }

    // Try to select last used blog
    if (this.blogs.length > 1) {
      this.subscriptions.add(
        this.userSettingsService.getLastBlogUuid().subscribe((lastBlogUuid) => {
          if (lastBlogUuid && this.blogs.some((b) => b.id === lastBlogUuid)) {
            this.form.patchValue({ blogUuid: lastBlogUuid });
          }
        }),
      );
    }
  }

  /**
   * Track blog selection for future auto-select
   */
  onBlogSelected(blogUuid: string): void {
    if (blogUuid) {
      this.userSettingsService.setLastBlogUuid(blogUuid);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const formValue = this.form.value;

    if (this.isEdit && this.data?.article) {
      // Update existing article
      this.subscriptions.add(
        this.blogsService
          .updateArticle(this.data.article.id, {
            title: formValue.title,
            subtitle: formValue.subtitle,
            content: formValue.content,
            description: formValue.description,
            slug: formValue.slug,
          })
          .subscribe({
            next: (result) => {
              this.loading = false;
              if (result.success) {
                this.messageService.success('Article updated successfully');
                this.dialogRef.close(result.article);
              } else {
                this.messageService.error('Failed to update article');
              }
            },
            error: (err) => {
              this.loading = false;
              this.messageService.error('Failed to update article: ' + err.message);
            },
          }),
      );
    } else {
      // Create new article
      this.subscriptions.add(
        this.blogsService
          .createArticle(formValue.blogUuid, formValue.title, formValue.content, {
            subtitle: formValue.subtitle,
            description: formValue.description,
            slug: formValue.slug,
          })
          .subscribe({
            next: (result) => {
              this.loading = false;
              if (result.success) {
                this.messageService.success('Article created successfully');
                this.dialogRef.close(result.article);
              } else {
                this.messageService.error('Failed to create article');
              }
            },
            error: (err) => {
              this.loading = false;
              this.messageService.error('Failed to create article: ' + err.message);
            },
          }),
      );
    }
  }

  generateSlug(): void {
    const title = this.form.get('title')?.value;
    if (title) {
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      this.form.patchValue({ slug });
    }
  }
}
