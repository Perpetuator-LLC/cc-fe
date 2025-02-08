import { Component, OnInit, OnDestroy, ViewChild, TemplateRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { Job, JobService, jobTypeToString } from '../job.service';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatTooltip } from '@angular/material/tooltip';
import { ToolbarService } from '../toolbar.service';
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
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MessageService } from '../message.service';
import { MessageComponent } from '../message/message.component';
import { MatCard, MatCardContent } from '@angular/material/card';

@Component({
  selector: 'app-jobs-list',
  standalone: true,
  imports: [
    MatPaginatorModule,
    MatTableModule,
    MatSortModule,
    DatePipe,
    MatTooltip,
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
    MatCard,
    MatCardContent,
    DecimalPipe,
  ],
  templateUrl: './jobs-list.component.html',
  styleUrl: './jobs-list.component.scss',
})
export class JobsListComponent implements OnInit, OnDestroy {
  private subscriptions: Subscription = new Subscription();
  jobs: Job[] = [];
  dataSource = new MatTableDataSource<Job>(this.jobs);
  displayedColumns: string[] = ['jobType', 'status', 'message', 'cost', 'createdAt', 'updatedAt'];
  totalJobs = 0;
  pageSize = 10;
  currentPage = 0;
  sortDirection = 'DESC';
  sortActive = 'createdAt';

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;

  constructor(
    private jobService: JobService,
    private toolbarService: ToolbarService,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
    const viewContainerRef = this.toolbarService.getViewContainerRef();
    viewContainerRef.clear();
    viewContainerRef.createEmbeddedView(this.toolbarTemplate);
    this.loadJobs();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  loadJobs() {
    this.subscriptions.add(
      this.jobService
        .getUserJobs([], [], [], this.currentPage + 1, this.pageSize, this.sortActive, this.sortDirection)
        .subscribe({
          next: (data) => {
            this.jobs = data.jobs;
            this.dataSource.data = this.jobs;
            this.totalJobs = data.totalRecords;
          },
          error: (error) => {
            this.messageService.error('Failed to load jobs: ' + error.toString());
          },
        }),
    );
  }

  sortChange(sortState: Sort) {
    this.sortDirection = sortState.direction.toUpperCase();
    this.sortActive = sortState.active;
    this.loadJobs();
  }

  onPageChange(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.currentPage = event.pageIndex;
    this.loadJobs();
  }

  retryJob(id: string) {
    this.subscriptions.add(
      this.jobService.retryJobs([id]).subscribe({
        next: (data) => {
          this.jobs = [...data.jobs, ...this.jobs.filter((job) => job.id !== id)];
          this.dataSource.data = this.jobs;
        },
        error: (err: { message: string }) => {
          console.error(`Failed to retry job: ${err.message}`);
        },
        complete: () => {
          console.debug('Job retry complete');
        },
      }),
    );
  }

  protected readonly jobTypeToString = jobTypeToString;
}
