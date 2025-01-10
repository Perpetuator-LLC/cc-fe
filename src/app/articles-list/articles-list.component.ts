import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { MatCard, MatCardContent } from '@angular/material/card';
import { Router, RouterLink } from '@angular/router';
import { MatLine, MatOption } from '@angular/material/core';
import { DatePipe, SlicePipe } from '@angular/common';
import { MessageComponent } from '../message/message.component';
import { ToolbarService } from '../toolbar.service';
import { MessageService } from '../message.service';
import { Article, ArticleService } from '../article.service';
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
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';
import { MatDivider } from '@angular/material/divider';
import { TeamsService } from '../teams.service';
import { TeamsResult } from '../teams-list/teams-list.component';

@Component({
  selector: 'app-articles-list',
  standalone: true,
  imports: [
    MatPaginatorModule,
    MatTableModule,
    MatSortModule,
    MatLabel,
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
    MatFormField,
    MatSelect,
    MatOption,
    MatDivider,
    MatCardContent,
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
  loadingArticles = false;
  loadingTeams = false;
  selectedTeam: string | null = null;
  teams: TeamsResult[] = [];

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;

  constructor(
    private router: Router,
    private messageService: MessageService,
    private toolbarService: ToolbarService,
    private articleService: ArticleService,
    private teamsService: TeamsService,
  ) {}

  ngOnInit(): void {
    const viewContainerRef = this.toolbarService.getViewContainerRef();
    viewContainerRef.clear();
    viewContainerRef.createEmbeddedView(this.toolbarTemplate);
    this.loadArticles();
    this.loadTeams();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  loadArticles() {
    this.loadingArticles = true;
    this.subscriptions.add(
      this.articleService
        .getArticles(this.currentPage + 1, this.pageSize, this.sortActive, this.sortDirection, this.selectedTeam)
        .subscribe({
          next: (data) => {
            this.articles = data.articles;
            this.dataSource.data = this.articles;
            this.totalArticles = data.totalRecords;
            this.loadingArticles = false;
          },
          error: (error) => {
            this.messageService.error('Failed to load articles: ' + error.toString());
            this.loadingArticles = false;
          },
        }),
    );
  }

  loadTeams() {
    this.loadingTeams = true;

    this.subscriptions.add(
      this.teamsService.getMyTeams().subscribe({
        next: (teams: TeamsResult[]) => {
          this.teams = teams;
          this.loadingTeams = false;
        },
        error: (err: { message: string }) => {
          this.loadingTeams = false;
          this.messageService.error(`Failed to retrieve teams data: ${err.message}`);
        },
        complete: () => {
          this.loadingTeams = false;
        },
      }),
    );
  }

  sortChange(sortState: Sort) {
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
    this.router.navigate(['/article', id]);
  }
}
