import { Component, OnInit, OnDestroy, ViewChild, TemplateRef } from '@angular/core';
import { interval, Subject, Subscription } from 'rxjs';
import { Job, JobService, jobTypeToString } from '../job.service';
import { DatePipe } from '@angular/common';
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
} from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator, PageEvent } from '@angular/material/paginator';

@Component({
  selector: 'app-jobs-list',
  standalone: true,
  imports: [
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
  ],
  templateUrl: './jobs-list.component.html',
  styleUrl: './jobs-list.component.scss',
})
export class JobsListComponent implements OnInit, OnDestroy {
  private subscriptions: Subscription = new Subscription();
  private pollingSubscription: Subscription = new Subscription();
  jobCompleted$ = new Subject<Job>();
  jobs: Job[] = [];
  dataSource = new MatTableDataSource<Job>(this.jobs);
  displayedColumns: string[] = ['jobType', 'status', 'message', 'createdAt', 'updatedAt'];
  totalJobs = 0;
  pageSize = 10;
  currentPage = 0;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;

  constructor(
    private jobService: JobService,
    private toolbarService: ToolbarService,
  ) {}

  ngOnInit(): void {
    const viewContainerRef = this.toolbarService.getViewContainerRef();
    viewContainerRef.clear();
    viewContainerRef.createEmbeddedView(this.toolbarTemplate);
    this.loadJobs();
    this.setupPolling();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.pollingSubscription.unsubscribe();
  }

  loadJobs() {
    this.subscriptions.add(
      this.jobService.getUserJobs([], [], [], this.currentPage + 1, this.pageSize).subscribe((result) => {
        this.jobs = result.jobs;
        this.dataSource.data = this.jobs;
        this.totalJobs = result.totalRecords;
        this.setupPolling();
      }),
    );
  }

  onPageChange(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.currentPage = event.pageIndex;
    this.loadJobs();
  }

  retryJob(id: string) {
    this.subscriptions.add(
      this.jobService.retryJobs([id]).subscribe({
        next: (jobs: Job[]) => {
          this.jobs = [...jobs, ...this.jobs.filter((job) => job.id !== id)];
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

  private setupPolling() {
    this.pollingSubscription.unsubscribe();
    this.pollingSubscription = new Subscription();
    this.pollingSubscription.add(
      interval(this.getPollingInterval()).subscribe(() => {
        console.debug('Polling for job status updates');
        this.loadJobs();
      }),
    );
  }

  getPollingInterval(): number {
    return this.hasActiveJobs() ? 3000 : 10000;
  }

  hasActiveJobs(): boolean {
    return this.jobs.some((job) => job.status === 'pending' || job.status === 'running');
  }

  protected readonly jobTypeToString = jobTypeToString;
}
