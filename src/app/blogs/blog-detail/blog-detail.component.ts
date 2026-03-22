// Copyright (c) 2026 Perpetuator LLC
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription, debounceTime, filter, switchMap } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { BlogsService, Blog, Article } from '../blogs.service';
import { MessageService } from '../../message.service';
import { ConfirmationDialogComponent } from '../../confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-blog-detail',
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
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatTooltipModule,
    MatMenuModule,
    MatTabsModule,
    MatCheckboxModule,
  ],
  templateUrl: './blog-detail.component.html',
  styleUrl: './blog-detail.component.scss',
})
export class BlogDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly blogsService = inject(BlogsService);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);
  private subscriptions = new Subscription();

  loading = true;
  saving = false;
  blogUuid = '';
  blog: Blog | null = null;
  articles: Article[] = [];
  articlesDataSource = new MatTableDataSource<Article>([]);
  articleColumns = ['title', 'status', 'views', 'published', 'actions'];

  blogForm!: FormGroup;
  selectedTabIndex = 0;

  ngOnInit(): void {
    this.initForm();

    this.subscriptions.add(
      this.route.paramMap
        .pipe(
          filter((params) => params.has('uuid')),
          switchMap((params) => {
            this.blogUuid = params.get('uuid')!;
            this.loading = true;
            return this.blogsService.getBlog(this.blogUuid);
          }),
        )
        .subscribe({
          next: (blog) => {
            this.blog = blog;
            this.articles = blog.articles || [];
            this.articlesDataSource.data = this.articles;
            this.patchForm(blog);
            this.loading = false;
          },
          error: (err) => {
            this.messageService.error('Failed to load blog: ' + err.message);
            this.loading = false;
          },
        }),
    );

    // Auto-save on form changes
    this.subscriptions.add(
      this.blogForm.valueChanges
        .pipe(
          debounceTime(1000),
          filter(() => this.blogForm.dirty && this.blogForm.valid),
        )
        .subscribe(() => this.saveBlog()),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private initForm(): void {
    this.blogForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(200)]],
      slug: ['', Validators.maxLength(100)],
      description: ['', Validators.maxLength(500)],
      tagline: ['', Validators.maxLength(200)],
      prompt: [''],
      enabled: [true],
    });
  }

  private patchForm(blog: Blog): void {
    this.blogForm.patchValue({
      name: blog.name,
      slug: blog.slug || '',
      description: blog.description || '',
      tagline: blog.tagline || '',
      prompt: blog.prompt || '',
      enabled: blog.enabled,
    });
    this.blogForm.markAsPristine();
  }

  saveBlog(): void {
    if (!this.blog || this.saving) return;

    this.saving = true;
    const formValue = this.blogForm.value;

    this.subscriptions.add(
      this.blogsService
        .updateBlog(this.blog.id, {
          name: formValue.name,
          slug: formValue.slug || undefined,
          description: formValue.description || undefined,
          tagline: formValue.tagline || undefined,
          prompt: formValue.prompt || undefined,
          enabled: formValue.enabled,
        })
        .subscribe({
          next: (result) => {
            if (result.success) {
              this.blogForm.markAsPristine();
              this.messageService.info('Blog saved');
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

  getStatusClass(status: string): string {
    switch (status) {
      case 'ACTIVE':
      case 'PUBLISHED':
        return 'status-success';
      case 'DRAFT':
      case 'REVIEW':
        return 'status-draft';
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

  viewArticle(article: Article): void {
    this.router.navigate(['/media/articles', article.id]);
  }

  createArticle(): void {
    // Navigate to articles with blog pre-selected
    this.router.navigate(['/media/articles'], {
      queryParams: { blogUuid: this.blog?.id, action: 'create' },
    });
  }

  deleteBlog(): void {
    if (!this.blog) return;

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Delete Blog',
        message:
          `Are you sure you want to delete "${this.blog.name}"? ` + 'This will also delete all articles in this blog.',
        confirmText: 'Delete',
        confirmColor: 'warn',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed && this.blog) {
        this.subscriptions.add(
          this.blogsService.deleteBlog(this.blog.id).subscribe({
            next: (result) => {
              if (result.success) {
                this.messageService.info('Blog deleted');
                this.router.navigate(['/media/blogs']);
              } else {
                this.messageService.error('Failed to delete blog');
              }
            },
            error: (err) => {
              this.messageService.error('Failed to delete blog: ' + err.message);
            },
          }),
        );
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/media/blogs']);
  }
}
