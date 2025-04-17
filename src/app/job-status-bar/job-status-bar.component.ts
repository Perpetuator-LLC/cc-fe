// Copyright (c) 2025 Perpetuator LLC
import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { Subscription } from 'rxjs';
import { MatList, MatListItem } from '@angular/material/list';
import { MatTooltip } from '@angular/material/tooltip';
import { MatCard, MatCardHeader, MatCardSubtitle, MatCardTitle } from '@angular/material/card';
import { MatAccordion, MatExpansionPanel, MatExpansionPanelHeader } from '@angular/material/expansion';
import { MatButton } from '@angular/material/button';
import { MatProgressBar } from '@angular/material/progress-bar';
import { DatePipe } from '@angular/common';
import { Job, JobService, JobStatus, JobType, kindToString } from '../job.service';
import { MessageService } from '../message.service';
import { SidePanelAccordianData } from '../news/news.component';
import { toObservable } from '@angular/core/rxjs-interop';

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
  protected jobs: Job[] = [];
  constructor(
    private jobService: JobService,
    private messageService: MessageService,
  ) {
    toObservable(this.jobService.jobs).subscribe({
      next: (jobs) => {
        this.jobService.getJobTransitions(jobs, this.jobs, JobStatus.COMPLETED).forEach((job) => {
          this.messageService.success(`${kindToString(job.kind)} completed.`);
        });
        this.jobService.getJobTransitions(jobs, this.jobs, JobStatus.FAILED).forEach((job) => {
          this.messageService.error(`${kindToString(job.kind)} failed: ${job.error}`);
        });
        this.jobs = jobs;
      },
      error: (error) => {
        this.messageService.error(`Failed to load jobs: ${error.message}`);
      },
    });
  }

  @Input() data: SidePanelAccordianData = {
    title: '',
    panelOpenState: false,
  };

  ngOnInit(): void {
    if (this.data.panelOpenState === undefined) {
      this.data.panelOpenState = false;
    }
    this.loadJobs();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  loadJobs() {
    const currentJobIds = this.jobs.map((job) => job.id);
    this.subscriptions.add(
      this.jobService
        .getJobs(
          [JobStatus.PENDING, JobStatus.RUNNING],
          [
            JobType.SUMMARIZE_NEWS,
            JobType.FETCH_NEWS,
            JobType.EXTRACT_NEWS,
            JobType.CREATE_ARTICLE,
            JobType.UPDATE_ARTICLE_AUDIO,
          ],
          currentJobIds,
        )
        .subscribe((result) => {
          this.jobs = result.jobs;
        }),
    );
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

  protected readonly kindToString = kindToString;
  protected readonly JobStatus = JobStatus;
}
