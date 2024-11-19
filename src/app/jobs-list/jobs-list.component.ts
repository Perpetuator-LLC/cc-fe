import { Component, OnInit, OnDestroy, ViewChild, TemplateRef } from '@angular/core';
import { interval, Subject, Subscription } from 'rxjs';
import { Job, JobService, jobTypeToString } from '../job.service';
import { DatePipe } from '@angular/common';
import { MatCard, MatCardHeader, MatCardSubtitle, MatCardTitle } from '@angular/material/card';
import { MatList, MatListItem } from '@angular/material/list';
import { MatTooltip } from '@angular/material/tooltip';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatButton } from '@angular/material/button';
import { ToolbarService } from '../toolbar.service';

@Component({
  selector: 'app-jobs-list',
  standalone: true,
  imports: [
    DatePipe,
    MatCardTitle,
    MatCardHeader,
    MatList,
    MatListItem,
    MatCard,
    MatTooltip,
    MatCardSubtitle,
    MatProgressBar,
    MatButton,
  ],
  templateUrl: './jobs-list.component.html',
  styleUrl: './jobs-list.component.scss',
})
export class JobsListComponent implements OnInit, OnDestroy {
  private subscriptions: Subscription = new Subscription();
  private pollingSubscription: Subscription = new Subscription();
  jobCompleted$ = new Subject<Job>();
  jobs: Job[] = [];

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
      this.jobService.getUserJobs().subscribe((jobs) => {
        jobs.forEach((job: Job) => {
          const existingJob = this.jobs.find((j) => j.id === job.id);
          if (existingJob && existingJob.status !== job.status && job.status === 'completed') {
            this.jobCompleted$.next(job);
          }
        });
        this.jobs = jobs;
        this.setupPolling();
      }),
    );
  }

  addJob(job: Job) {
    this.jobs.push(job);
  }

  // updateJob(updatedJob: Job) {
  //   const index = this.jobs.findIndex((job) => job.id === updatedJob.id);
  //   if (index !== -1) {
  //     this.jobs[index] = updatedJob;
  //   }
  // }

  retryJob(id: string) {
    this.subscriptions.add(
      this.jobService.retryJobs([id]).subscribe({
        next: (jobs: Job[]) => {
          this.jobs = [...jobs, ...this.jobs.filter((job) => job.id !== id)];
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
    // 3s when there are active jobs, 10s when there are none
    return this.hasActiveJobs() ? 3000 : 10000;
  }

  hasActiveJobs(): boolean {
    return this.jobs.some((job) => job.status === 'pending' || job.status === 'running');
  }

  protected readonly jobTypeToString = jobTypeToString;
}
