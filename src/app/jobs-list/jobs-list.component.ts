// Copyright (c) 2025 Perpetuator LLC
import { Component, OnInit, OnDestroy, ViewChild, TemplateRef } from '@angular/core';
import { Subscription } from 'rxjs';
import {
  Job,
  JobKind,
  JobService,
  JobStatus,
  kindToString,
  statusToString,
  stringToJobKind,
  stringToJobStatus,
} from '../job.service';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatTooltip } from '@angular/material/tooltip';
import { ToolbarService } from '../toolbar.service';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
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
import { SvgIconComponent } from '../svg-icon/svg-icon.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-jobs-list',
  standalone: true,
  imports: [
    CommonModule,
    MatPaginatorModule,
    MatTableModule,
    MatSortModule,
    DatePipe,
    MatTooltip,
    MatTable,
    MatSort,
    MatIcon,
    MatButton,
    MatIconButton,
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
    SvgIconComponent,
  ],
  templateUrl: './jobs-list.component.html',
  styleUrl: './jobs-list.component.scss',
})
export class JobsListComponent implements OnInit, OnDestroy {
  private subscriptions: Subscription = new Subscription();
  jobs: Job[] = [];
  dataSource = new MatTableDataSource<Job>(this.jobs);
  displayedColumns: string[] = ['kind', 'message', 'cost', 'createdAt', 'updatedAt', 'status'];
  totalJobs = 0;
  pageSize = 10;
  cursors: (string | null)[] = [null];
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

  loadJobs(after: string | null = null, pageIndex = 0) {
    this.subscriptions.add(
      this.jobService.getJobs([], [], [], this.pageSize, after, this.sortActive, this.sortDirection).subscribe({
        next: ({ jobs, pageInfo }) => {
          this.jobs = jobs;
          this.dataSource.data = this.jobs;
          this.cursors[pageIndex + 1] = pageInfo.endCursor ?? null;
          this.totalJobs = pageInfo.hasNextPage ? (pageIndex + 2) * this.pageSize : (pageIndex + 1) * this.pageSize;
        },
        error: (error) => {
          this.messageService.error('Failed to load jobs: ' + error.toString());
        },
      }),
    );
  }

  sortChange(sortState: Sort) {
    this.sortActive = sortState.active;
    this.sortDirection = sortState.direction.toUpperCase();
    this.cursors = [null]; // reset all known cursors
    this.paginator.firstPage();
    this.loadJobs();
  }

  onPageChange(event: PageEvent) {
    const newPageIndex = event.pageIndex;
    const newPageSize = event.pageSize;

    // If pageSize changed, reset pagination entirely
    if (newPageSize !== this.pageSize) {
      this.pageSize = newPageSize;
      this.cursors = [null]; // reset all known cursors
      this.paginator.firstPage(); // back to pageIndex = 0
      this.loadJobs(); // load first page
      return;
    }

    // Otherwise, grab the cursor for the page they jumped to
    const after = this.cursors[newPageIndex] ?? null;
    this.loadJobs(after, newPageIndex);
  }

  deleteJob(id: string) {
    this.subscriptions.add(
      this.jobService.deleteJobs([id]).subscribe({
        next: () => {
          this.jobs = this.jobs.filter((job) => job.id !== id);
          this.messageService.success('Job deleted.');
        },
        error: (err: { message: string }) => {
          this.messageService.error(`Failed to delete job: ${err.message}`);
        },
      }),
    );
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

  // Group jobs by date for timeline view
  get groupedJobs() {
    if (!this.jobs) return [];
    const groups: { label: string; jobs: Job[] }[] = [];
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const dateLabel = (dateStr: string) => {
      const date = new Date(dateStr);
      if (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      ) {
        return (
          'Today, ' +
          date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
        );
      }
      if (
        date.getDate() === yesterday.getDate() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getFullYear() === yesterday.getFullYear()
      ) {
        return (
          'Yesterday, ' +
          date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
        );
      }
      return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    };

    const jobsByDate = this.jobs.reduce((acc: Record<string, Job[]>, job) => {
      const dateKey = job.createdAt.split('T')[0];
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(job);
      return acc;
    }, {});

    Object.keys(jobsByDate)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .forEach((dateKey) => {
        groups.push({
          label: dateLabel(dateKey),
          jobs: jobsByDate[dateKey].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        });
      });

    return groups;
  }

  statusClass(status: string): string {
    switch (stringToJobStatus(status)) {
      case JobStatus.PENDING:
        return 'job-pending';
      case JobStatus.RUNNING:
        return 'job-running';
      case JobStatus.COMPLETED:
        return 'job-success';
      case JobStatus.FAILED:
        return 'job-failed';
      default:
        return '';
    }
  }

  iconForJob(kind: string): string {
    switch (stringToJobKind(kind)) {
      case JobKind.FETCH_NEWS:
        return 'cloud_download';
      case JobKind.EXTRACT_NEWS:
        return 'auto_fix_high';
      case JobKind.SUMMARIZE_NEWS:
        return 'summarize';
      case JobKind.CREATE_EPISODE:
        return 'mic';
      case JobKind.UPDATE_EPISODE_AUDIO:
        return 'audiotrack';
      default:
        return 'work';
    }
  }

  // retryJob(uuid: string) {
  //   this.subscriptions.add(
  //     this.jobService.retryJobs([uuid]).subscribe({
  //       next: () => {
  //         this.messageService.success('Job retry initiated.');
  //         this.loadJobs(); // Reload to get updated job list
  //       },
  //       error: (err: { message: string }) => {
  //         this.messageService.error(`Failed to retry job: ${err.message}`);
  //       },
  //     }),
  //   );
  // }

  protected readonly kindToString = kindToString;
  protected readonly statusToString = statusToString;
  protected readonly stringToJobStatus = stringToJobStatus;
  protected readonly JobStatus = JobStatus;
}
