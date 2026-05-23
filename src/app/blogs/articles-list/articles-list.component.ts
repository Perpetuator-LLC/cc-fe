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
import { BlogsService, Article } from '../blogs.service';

type ArticleDisplay = Article & { statusClass: string; formattedDate: string };
import { MessageService } from '../../message.service';
import { ArticleDialogComponent } from '../article-dialog/article-dialog.component';

@Component({
  selector: 'app-articles-list',
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
  templateUrl: './articles-list.component.html',
  styleUrl: './articles-list.component.scss',
})
export class ArticlesListComponent implements OnInit, OnDestroy {
  private readonly blogsService = inject(BlogsService);
  private readonly messageService = inject(MessageService);
  private readonly dialog = inject(MatDialog);
  private subscriptions = new Subscription();

  loading = true;
  articles: ArticleDisplay[] = [];
  dataSource = new MatTableDataSource<ArticleDisplay>([]);
  displayedColumns = ['title', 'blog', 'status', 'date', 'views'];

  ngOnInit(): void {
    this.loadArticles();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadArticles(): void {
    this.loading = true;
    this.subscriptions.add(
      this.blogsService.getArticles().subscribe({
        next: (articles) => {
          this.articles = articles.map((a) => ({
            ...a,
            statusClass: this.getStatusClass(a.status),
            formattedDate: this.formatDate(a.publishedAt || a.createdAt),
          }));
          this.dataSource.data = this.articles;
          this.loading = false;
        },
        error: (err) => {
          this.messageService.error('Failed to load articles: ' + err.message);
          this.loading = false;
        },
      }),
    );
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PUBLISHED':
        return 'status-success';
      case 'DRAFT':
        return 'status-draft';
      case 'REVIEW':
        return 'status-warning';
      case 'ARCHIVED':
        return 'status-archived';
      default:
        return '';
    }
  }

  createArticle(): void {
    const dialogRef = this.dialog.open(ArticleDialogComponent, {
      width: '600px',
      maxHeight: '90vh',
      data: {},
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadArticles();
      }
    });
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  }
}
