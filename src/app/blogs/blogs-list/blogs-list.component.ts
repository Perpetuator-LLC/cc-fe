// Copyright (c) 2026 Perpetuator LLC
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { BlogsService, Blog } from '../blogs.service';

type BlogDisplay = Blog & { statusClass: string; formattedLatestDate: string };
import { MessageService } from '../../message.service';
import { CreateBlogDialogComponent } from '../create-blog-dialog/create-blog-dialog.component';

@Component({
  selector: 'app-blogs-list',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    MatTableModule,
    RouterLink,
  ],
  templateUrl: './blogs-list.component.html',
  styleUrl: './blogs-list.component.scss',
})
export class BlogsListComponent implements OnInit, OnDestroy {
  private readonly blogsService = inject(BlogsService);
  private readonly messageService = inject(MessageService);
  private readonly dialog = inject(MatDialog);
  private subscriptions = new Subscription();

  loading = true;
  /** Blogs enriched with pre-built statusClass + formattedLatestDate per row. */
  blogs: BlogDisplay[] = [];
  dataSource = new MatTableDataSource<BlogDisplay>([]);
  displayedColumns = ['name', 'status', 'articles', 'views', 'updated'];

  ngOnInit(): void {
    this.loadBlogs();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadBlogs(): void {
    this.loading = true;
    this.subscriptions.add(
      this.blogsService.getBlogs().subscribe({
        next: (blogs) => {
          this.blogs = blogs.map((b) => ({
            ...b,
            statusClass: this.getStatusClass(b.status),
            formattedLatestDate: this.formatDate(b.latestArticleDate || b.updatedAt),
          }));
          this.dataSource.data = this.blogs;
          this.loading = false;
        },
        error: (err) => {
          this.messageService.error('Failed to load blogs: ' + err.message);
          this.loading = false;
        },
      }),
    );
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'ACTIVE':
        return 'status-success';
      case 'DRAFT':
        return 'status-draft';
      case 'ARCHIVED':
        return 'status-archived';
      default:
        return '';
    }
  }

  createBlog(): void {
    const dialogRef = this.dialog.open(CreateBlogDialogComponent, {
      width: '500px',
      maxHeight: '90vh',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.blog) {
        this.loadBlogs();
      }
    });
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  }
}
