import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { interval, Subject, Subscription } from 'rxjs';
import { MatList, MatListItem } from '@angular/material/list';
import { MatTooltip } from '@angular/material/tooltip';
import { MatCard, MatCardHeader, MatCardSubtitle, MatCardTitle } from '@angular/material/card';
import { MatAccordion, MatExpansionPanel, MatExpansionPanelHeader } from '@angular/material/expansion';
import { MatButton } from '@angular/material/button';
import { MatProgressBar } from '@angular/material/progress-bar';
import { DatePipe } from '@angular/common';
import { Job, JobService, jobTypeToString } from '../job.service';
import { MessageService } from '../message.service';
import { SidePanelAccordianData } from '../crypto-news/crypto-news.component';

@Component({
  selector: 'app-job-status-bar',
  standalone: true,
  imports: [
    MatList,
    MatListItem,
    MatTooltip,
    MatCard,
    MatAccordion,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatCardHeader,
    MatButton,
    MatCardSubtitle,
    MatProgressBar,
    MatCardTitle,
    DatePipe,
  ],
  templateUrl: './job-status-bar.component.html',
  styleUrl: './job-status-bar.component.scss',
})
export class JobStatusBarComponent implements OnInit, OnDestroy {
  private subscriptions: Subscription = new Subscription();
  private pollingSubscription: Subscription = new Subscription();
  jobCompleted$ = new Subject<Job>();
  jobFailed$ = new Subject<Job>();
  protected jobs: Job[] = [];
  constructor(
    private jobService: JobService,
    private messageService: MessageService,
  ) {}

  @Input() data: SidePanelAccordianData = {
    title: '',
    panelOpenState: false,
  };

  ngOnInit(): void {
    // Initialize with closed state if not provided
    if (this.data.panelOpenState === undefined) {
      this.data.panelOpenState = false;
    }
    // this.messageService.clearMessages();
    this.loadJobs();
    this.setupPolling();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.pollingSubscription.unsubscribe();
  }

  loadJobs() {
    // collect the currently loaded job ids, so that if one transitions to complete we still display it...
    const currentJobIds = this.jobs.map((job) => job.id);
    this.subscriptions.add(
      this.jobService
        .getUserJobs(
          ['pending', 'running'],
          ['fetch_crypto_news', 'extract_crypto_news', 'summarize_crypto_news', 'create_crypto_article'],
          currentJobIds,
        )
        .subscribe((result) => {
          const jobs = result.jobs;
          jobs.forEach((job: Job) => {
            const existingJob = this.jobs.find((j) => j.id === job.id);
            const jobStatusChanged = existingJob !== undefined && existingJob.status !== job.status;
            if (!jobStatusChanged) {
              return;
            }
            if (job.status === 'completed') {
              this.jobCompleted$.next(job);
              this.messageService.success(`${jobTypeToString(job.jobType)} completed.`);
            } else if (job.status === 'failed') {
              this.jobFailed$.next(job);
              this.messageService.error(`${jobTypeToString(job.jobType)} failed: ${job.error}`);
            }
          });
          // now filter any completed jobs over X seconds old
          const now = new Date();
          const xSecondsAgo = new Date(now.getTime() - 15 * 1000); // X seconds ago
          this.jobs = jobs.filter((job: Job) => {
            if (job.status === 'completed') {
              const updatedAt = new Date(job.updatedAt);
              return updatedAt >= xSecondsAgo;
            }
            return true;
          });
          this.setupPolling();
        }),
    );
  }

  addJobs(jobs: Job[]) {
    this.jobs = [...jobs, ...this.jobs];
    this.setupPolling();
  }

  addJob(job: Job) {
    this.jobs = [job, ...this.jobs];
    this.setupPolling();
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

  protected readonly jobTypeToString = jobTypeToString;

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
    // 3s when there are active jobs, 8s when there are none
    return this.hasActiveJobs() ? 3000 : 8000;
  }

  hasActiveJobs(): boolean {
    return this.jobs.some((job) => job.status === 'pending' || job.status === 'running');
  }
}
