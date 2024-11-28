import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { MatCard } from '@angular/material/card';
import { Router, RouterLink } from '@angular/router';
import { MatLine } from '@angular/material/core';
import { DatePipe, SlicePipe } from '@angular/common';
import { MessageComponent } from '../message/message.component';
import { ToolbarService } from '../toolbar.service';
import { MessageService } from '../message.service';
import { Article, CryptoArticleService } from '../crypto-article.service';
import { Subscription } from 'rxjs';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import {
  MatCell,
  MatCellDef,
  MatColumnDef,
  MatHeaderCell,
  MatHeaderCellDef,
  MatHeaderRow,
  MatHeaderRowDef,
  MatRow,
  MatRowDef,
  MatTable,
  MatTableDataSource,
  MatTableModule,
} from '@angular/material/table';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatDivider } from '@angular/material/divider';

@Component({
  selector: 'app-articles-list',
  standalone: true,
  imports: [
    MatPaginatorModule,
    MatTableModule,
    MatSortModule,
    MatDivider,
    MatCard,
    RouterLink,
    MatLine,
    SlicePipe,
    DatePipe,
    MatProgressSpinner,
    MatTable,
    MatSort,
    MatColumnDef,
    MatHeaderCell,
    MatCell,
    MatCellDef,
    MatHeaderCellDef,
    MatHeaderRowDef,
    MatRow,
    MatHeaderRow,
    MatRowDef,
    MatPaginator,
    MessageComponent,
  ],
  templateUrl: './articles-list.component.html',
  styleUrl: './articles-list.component.scss',
})
export class ArticlesListComponent implements OnInit, OnDestroy {
  private subscriptions = new Subscription();
  articles: Article[] = [];
  dataSource = new MatTableDataSource(this.articles);
  displayedColumns: string[] = ['date', 'title', 'team'];
  totalArticles = 0;
  pageSize = 10;
  currentPage = 0;
  sortDirection = 'DESC';
  sortActive = 'date';
  loading = false;

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;

  constructor(
    private router: Router,
    private messageService: MessageService,
    private toolbarService: ToolbarService,
    private articleService: CryptoArticleService,
  ) {}

  ngOnInit(): void {
    const viewContainerRef = this.toolbarService.getViewContainerRef();
    viewContainerRef.clear();
    viewContainerRef.createEmbeddedView(this.toolbarTemplate);
    this.loadArticles();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  loadArticles() {
    this.loading = true;
    this.subscriptions.add(
      this.articleService
        .getCryptoArticles(this.currentPage + 1, this.pageSize, this.sortActive, this.sortDirection)
        .subscribe({
          next: (data) => {
            this.articles = data.articles;
            this.dataSource.data = this.articles;
            this.totalArticles = data.totalRecords;
            this.loading = false;
          },
          error: (error) => {
            this.messageService.error('Failed to load articles: ' + error.toString());
            this.loading = false;
          },
        }),
    );
  }

  sortChange(sortState: Sort) {
    console.log(sortState);
    this.sortDirection = sortState.direction.toUpperCase();
    this.sortActive = sortState.active;
    this.loadArticles();
  }

  onPageChange(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.currentPage = event.pageIndex;
    this.loadArticles();
  }

  viewArticle(id: string) {
    this.router.navigate(['/crypto-article', id]);
  }
}
