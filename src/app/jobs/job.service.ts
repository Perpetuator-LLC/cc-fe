// Copyright (c) 2025 Perpetuator LLC
import { Injectable, OnDestroy, signal, WritableSignal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import gql from 'graphql-tag';
import { map, Subscription } from 'rxjs';
import { BaseService } from '../base.service';
import { Apollo } from 'apollo-angular';
import { ErrorHandlerService } from '../utils/error-handler.service';
import { MessageService } from '../message.service';
import { RelayConnection } from '../utils/relay';
import { JobsWebSocketService } from './jobs-websocket.service';

export enum JobKind {
  FETCH_NEWS = 'FETCH_NEWS',
  EXTRACT_NEWS = 'EXTRACT_NEWS',
  SUMMARIZE_NEWS = 'SUMMARIZE_NEWS',
  VALIDATE_NEWS = 'VALIDATE_NEWS',
  CREATE_EPISODE = 'CREATE_EPISODE',
  SELECT_UNUSED_NEWS = 'SELECT_UNUSED_NEWS',
  UPDATE_EPISODE_AUDIO = 'UPDATE_EPISODE_AUDIO',
  PUBLISH_EPISODE_AUDIO = 'PUBLISH_EPISODE_AUDIO',
  VALIDATE_EPISODE = 'VALIDATE_EPISODE',
  VALIDATE_EPISODE_COMPLIANCE = 'VALIDATE_EPISODE_COMPLIANCE',
  VALIDATE_EPISODE_FACTS = 'VALIDATE_EPISODE_FACTS',
  VALIDATE_EPISODE_LENGTH = 'VALIDATE_EPISODE_LENGTH',
  PUBLISH_LATEST_EPISODE_CHAIN = 'PUBLISH_LATEST_EPISODE_CHAIN',
  REFRESH_STOCK_LISTINGS = 'REFRESH_STOCK_LISTINGS',
  SCHEDULE_JOB = 'SCHEDULE_JOB',
  CANCEL_SCHEDULED_JOB = 'CANCEL_SCHEDULED_JOB',
  FETCH_COMPANY_INFO = 'FETCH_COMPANY_INFO',
  FETCH_STOCK_PRICES = 'FETCH_STOCK_PRICES',
  FETCH_BALANCE_SHEET = 'FETCH_BALANCE_SHEET',
  FETCH_INCOME_STATEMENT = 'FETCH_INCOME_STATEMENT',
  FETCH_CASH_FLOW = 'FETCH_CASH_FLOW',
  FETCH_EARNINGS = 'FETCH_EARNINGS',
  CREATE_RESEARCH_TOPIC = 'CREATE_RESEARCH_TOPIC',
  RESEARCH_TOPIC = 'RESEARCH_TOPIC',
  VALIDATE_RESEARCH = 'VALIDATE_RESEARCH',
  GENERATE_RESEARCH_TRANSCRIPT = 'GENERATE_RESEARCH_TRANSCRIPT',
  CREATE_RESEARCH_EPISODE = 'CREATE_RESEARCH_EPISODE',
  PUBLISH_RESEARCH_TOPIC_EPISODE_CHAIN = 'PUBLISH_RESEARCH_TOPIC_EPISODE_CHAIN',
  GENERATE_PODCAST = 'GENERATE_PODCAST',
  TEST_PRINT = 'TEST_PRINT',
  TEST_RAISE = 'TEST_RAISE',
}

export const stringToJobKind = (kind: string) => {
  switch (kind.toUpperCase()) {
    case 'FETCH_NEWS':
      return JobKind.FETCH_NEWS;
    case 'EXTRACT_NEWS':
      return JobKind.EXTRACT_NEWS;
    case 'SUMMARIZE_NEWS':
      return JobKind.SUMMARIZE_NEWS;
    case 'VALIDATE_NEWS':
      return JobKind.VALIDATE_NEWS;
    case 'CREATE_EPISODE':
      return JobKind.CREATE_EPISODE;
    case 'SELECT_UNUSED_NEWS':
      return JobKind.SELECT_UNUSED_NEWS;
    case 'UPDATE_EPISODE_AUDIO':
      return JobKind.UPDATE_EPISODE_AUDIO;
    case 'PUBLISH_EPISODE_AUDIO':
      return JobKind.PUBLISH_EPISODE_AUDIO;
    case 'VALIDATE_EPISODE':
      return JobKind.VALIDATE_EPISODE;
    case 'VALIDATE_EPISODE_COMPLIANCE':
      return JobKind.VALIDATE_EPISODE_COMPLIANCE;
    case 'VALIDATE_EPISODE_FACTS':
      return JobKind.VALIDATE_EPISODE_FACTS;
    case 'VALIDATE_EPISODE_LENGTH':
      return JobKind.VALIDATE_EPISODE_LENGTH;
    case 'PUBLISH_LATEST_EPISODE_CHAIN':
      return JobKind.PUBLISH_LATEST_EPISODE_CHAIN;
    case 'REFRESH_STOCK_LISTINGS':
      return JobKind.REFRESH_STOCK_LISTINGS;
    case 'SCHEDULE_JOB':
      return JobKind.SCHEDULE_JOB;
    case 'CANCEL_SCHEDULED_JOB':
      return JobKind.CANCEL_SCHEDULED_JOB;
    case 'FETCH_COMPANY_INFO':
      return JobKind.FETCH_COMPANY_INFO;
    case 'FETCH_STOCK_PRICES':
      return JobKind.FETCH_STOCK_PRICES;
    case 'FETCH_BALANCE_SHEET':
      return JobKind.FETCH_BALANCE_SHEET;
    case 'FETCH_INCOME_STATEMENT':
      return JobKind.FETCH_INCOME_STATEMENT;
    case 'FETCH_CASH_FLOW':
      return JobKind.FETCH_CASH_FLOW;
    case 'FETCH_EARNINGS':
      return JobKind.FETCH_EARNINGS;
    case 'CREATE_RESEARCH_TOPIC':
      return JobKind.CREATE_RESEARCH_TOPIC;
    case 'RESEARCH_TOPIC':
      return JobKind.RESEARCH_TOPIC;
    case 'VALIDATE_RESEARCH':
      return JobKind.VALIDATE_RESEARCH;
    case 'GENERATE_RESEARCH_TRANSCRIPT':
      return JobKind.GENERATE_RESEARCH_TRANSCRIPT;
    case 'CREATE_RESEARCH_EPISODE':
      return JobKind.CREATE_RESEARCH_EPISODE;
    case 'PUBLISH_RESEARCH_TOPIC_EPISODE_CHAIN':
      return JobKind.PUBLISH_RESEARCH_TOPIC_EPISODE_CHAIN;
    case 'GENERATE_PODCAST':
      return JobKind.GENERATE_PODCAST;
    case 'TEST_PRINT':
      return JobKind.TEST_PRINT;
    case 'TEST_RAISE':
      return JobKind.TEST_RAISE;
    default:
      throw new Error('Invalid job type');
  }
};

export const kindToString = (kind: string) => {
  switch (kind.toUpperCase()) {
    case JobKind.FETCH_NEWS:
      return 'Fetch News';
    case JobKind.EXTRACT_NEWS:
      return 'Extract News';
    case JobKind.SUMMARIZE_NEWS:
      return 'Summarize News';
    case JobKind.VALIDATE_NEWS:
      return 'Validate News';
    case JobKind.CREATE_EPISODE:
      return 'Create Episode';
    case JobKind.SELECT_UNUSED_NEWS:
      return 'Select Unused News';
    case JobKind.UPDATE_EPISODE_AUDIO:
      return 'Update Episode Audio';
    case JobKind.PUBLISH_EPISODE_AUDIO:
      return 'Publish Episode Audio';
    case JobKind.VALIDATE_EPISODE:
      return 'Validate Episode';
    case JobKind.VALIDATE_EPISODE_COMPLIANCE:
      return 'Validate Compliance';
    case JobKind.VALIDATE_EPISODE_FACTS:
      return 'Validate Facts';
    case JobKind.VALIDATE_EPISODE_LENGTH:
      return 'Validate Length';
    case JobKind.PUBLISH_LATEST_EPISODE_CHAIN:
      return 'Publish Latest News Episode Chain';
    case JobKind.REFRESH_STOCK_LISTINGS:
      return 'Refresh Stock Listings';
    case JobKind.SCHEDULE_JOB:
      return 'Schedule Job';
    case JobKind.CANCEL_SCHEDULED_JOB:
      return 'Cancel Scheduled Job';
    case JobKind.FETCH_COMPANY_INFO:
      return 'Fetch Company Info';
    case JobKind.FETCH_STOCK_PRICES:
      return 'Fetch Stock Prices';
    case JobKind.FETCH_BALANCE_SHEET:
      return 'Fetch Balance Sheet';
    case JobKind.FETCH_INCOME_STATEMENT:
      return 'Fetch Income Statement';
    case JobKind.FETCH_CASH_FLOW:
      return 'Fetch Cash Flow';
    case JobKind.FETCH_EARNINGS:
      return 'Fetch Earnings';
    case JobKind.CREATE_RESEARCH_TOPIC:
      return 'Create Research Topic';
    case JobKind.RESEARCH_TOPIC:
      return 'Research Topic';
    case JobKind.VALIDATE_RESEARCH:
      return 'Validate Research';
    case JobKind.GENERATE_RESEARCH_TRANSCRIPT:
      return 'Generate Research';
    case JobKind.CREATE_RESEARCH_EPISODE:
      return 'Create Research Episode';
    case JobKind.PUBLISH_RESEARCH_TOPIC_EPISODE_CHAIN:
      return 'Publish Research Topic Episode Chain';
    case JobKind.GENERATE_PODCAST:
      return 'Generate Podcast';
    case JobKind.TEST_PRINT:
      return 'Test Print';
    case JobKind.TEST_RAISE:
      return 'Test Raise';
    default:
      return 'N/A';
  }
};

export const iconForJob = (kind: string): string => {
  switch (stringToJobKind(kind)) {
    case JobKind.FETCH_NEWS:
      return 'cloud_download';
    case JobKind.EXTRACT_NEWS:
      return 'auto_fix_high';
    case JobKind.SUMMARIZE_NEWS:
      return 'summarize';
    case JobKind.VALIDATE_NEWS:
      return 'fact_check';
    case JobKind.CREATE_EPISODE:
      return 'mic';
    case JobKind.SELECT_UNUSED_NEWS:
      return 'check_circle';
    case JobKind.UPDATE_EPISODE_AUDIO:
      return 'audiotrack';
    case JobKind.PUBLISH_EPISODE_AUDIO:
      return 'cloud_upload';
    case JobKind.VALIDATE_EPISODE:
      return 'verified';
    case JobKind.VALIDATE_EPISODE_COMPLIANCE:
      return 'rule';
    case JobKind.VALIDATE_EPISODE_FACTS:
      return 'fact_check';
    case JobKind.VALIDATE_EPISODE_LENGTH:
      return 'straighten';
    case JobKind.PUBLISH_LATEST_EPISODE_CHAIN:
      return 'published_with_changes';
    case JobKind.REFRESH_STOCK_LISTINGS:
      return 'refresh';
    case JobKind.SCHEDULE_JOB:
      return 'schedule';
    case JobKind.CANCEL_SCHEDULED_JOB:
      return 'cancel_schedule_send';
    case JobKind.FETCH_COMPANY_INFO:
      return 'business';
    case JobKind.FETCH_STOCK_PRICES:
      return 'trending_up';
    case JobKind.FETCH_BALANCE_SHEET:
      return 'account_balance';
    case JobKind.FETCH_INCOME_STATEMENT:
      return 'payments';
    case JobKind.FETCH_CASH_FLOW:
      return 'account_balance_wallet';
    case JobKind.FETCH_EARNINGS:
      return 'monetization_on';
    case JobKind.CREATE_RESEARCH_TOPIC:
      return 'topic';
    case JobKind.RESEARCH_TOPIC:
      return 'search';
    case JobKind.VALIDATE_RESEARCH:
      return 'verified';
    case JobKind.GENERATE_RESEARCH_TRANSCRIPT:
      return 'description';
    case JobKind.CREATE_RESEARCH_EPISODE:
      return 'podcasts';
    case JobKind.PUBLISH_RESEARCH_TOPIC_EPISODE_CHAIN:
      return 'rocket_launch';
    case JobKind.GENERATE_PODCAST:
      return 'auto_awesome';
    case JobKind.TEST_RAISE:
      return 'bug_report';
    case JobKind.TEST_PRINT:
      return 'print';
    default:
      return 'work';
  }
};

export enum JobStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export const stringToJobStatus = (status: string) => {
  switch (status.toUpperCase()) {
    case 'PENDING':
      return JobStatus.PENDING;
    case 'RUNNING':
      return JobStatus.RUNNING;
    case 'COMPLETED':
      return JobStatus.COMPLETED;
    case 'FAILED':
      return JobStatus.FAILED;
    default:
      throw new Error('Invalid job status');
  }
};

export const statusToString = (status: string) => {
  switch (status.toUpperCase()) {
    case JobStatus.PENDING:
      return 'Pending';
    case JobStatus.RUNNING:
      return 'Running';
    case JobStatus.COMPLETED:
      return 'Completed';
    case JobStatus.FAILED:
      return 'Failed';
    default:
      return 'N/A';
  }
};

export interface JobResult {
  message?: string;
  podcastUuid?: string;
  episodeUuid?: string;
  topicUuid?: string;
  newsUuids?: string[];
  [key: string]: unknown;
}

export interface JobArgs {
  podcastUuid?: string;
  episodeUuid?: string;
  topicUuid?: string;
  [key: string]: unknown;
}

export interface Job {
  id: string;
  uuid: string;
  kind: string;
  status: string;
  error: string;
  result: JobResult | null;
  args: JobArgs | null;
  createdAt: string;
  updatedAt: string;
  cost?: number;
}

@Injectable({
  providedIn: 'root',
})
export class JobService extends BaseService implements OnDestroy {
  private subscriptions = new Subscription();
  private jobsSignal: WritableSignal<Job[]> = signal([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private cleanupInterval: any;

  constructor(
    protected override apollo: Apollo,
    protected override errorHandler: ErrorHandlerService,
    private jobsWebSocketService: JobsWebSocketService,
    private messageService: MessageService,
  ) {
    super(apollo, errorHandler);
    this.setupWebSocketSync();
    this.setupCleanupLoop();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    clearInterval(this.cleanupInterval);
  }

  get jobs(): WritableSignal<Job[]> {
    return this.jobsSignal;
  }

  private setupCleanupLoop() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldJobs();
    }, 5000); // Run cleanup every 5 seconds
  }

  private cleanupOldJobs() {
    const now = new Date();
    const jobs = this.jobsSignal();
    const filteredJobs = jobs.filter((job) => {
      const updatedAt = new Date(job.updatedAt);
      if (stringToJobStatus(job.status) === JobStatus.COMPLETED) {
        return now.getTime() - updatedAt.getTime() <= 5000; // Keep completed job for 5 seconds
      } else if (stringToJobStatus(job.status) === JobStatus.FAILED) {
        return now.getTime() - updatedAt.getTime() <= 15000; // Keep failed job for 15 seconds
      }
      return true;
    });
    if (filteredJobs.length !== jobs.length) {
      this.jobsSignal.set(filteredJobs);
    }
  }

  /**
   * Sync jobs signal with WebSocket service
   * The WebSocket service handles connection/disconnection based on auth state
   */
  private setupWebSocketSync() {
    // Sync jobs from WebSocket service to local signal
    this.subscriptions.add(
      toObservable(this.jobsWebSocketService.jobs).subscribe({
        next: (jobs) => {
          this.jobsSignal.set(jobs);
        },
        error: (error) => {
          this.messageService.error(`Failed to sync jobs: ${error.message}`);
        },
      }),
    );
  }

  addJobs(jobs: Job[]) {
    // Add to WebSocket service which will sync back to our signal
    this.jobsWebSocketService.addJobs(jobs);
  }

  addJob(job: Job) {
    // Add to WebSocket service which will sync back to our signal
    this.jobsWebSocketService.addJob(job);
  }

  getJobTransitions(newJobs: Job[], previousJobs: Job[], status: string) {
    const transitionedJobs: Job[] = [];
    console.debug(
      '[JobService] getJobTransitions: checking',
      newJobs.length,
      'new vs',
      previousJobs.length,
      'previous for status:',
      status,
    );

    newJobs.forEach((job: Job) => {
      const existingJob = previousJobs.find((j) => j.uuid === job.uuid);

      if (!existingJob) {
        console.debug('[JobService] Job not in previous jobs:', job.uuid, job.status);
        return;
      }

      const jobStatusChanged = stringToJobStatus(existingJob.status) !== stringToJobStatus(job.status);

      console.debug(
        '[JobService] Job',
        job.uuid,
        'status:',
        existingJob.status,
        '->',
        job.status,
        'changed:',
        jobStatusChanged,
      );

      if (!jobStatusChanged) {
        return;
      }
      if (stringToJobStatus(job.status) === stringToJobStatus(status)) {
        console.debug('[JobService] Detected transition to', status, 'for job:', job.uuid);
        transitionedJobs.push(job);
      }
    });
    return transitionedJobs;
  }

  getJobs(
    statuses: string[] = [],
    kinds: string[] = [],
    jobUuids: string[] = [],
    first = 10,
    after: string | null = null,
    sort = 'createdAt',
    direction = 'DESC',
  ) {
    const FETCH_USER_JOBS = gql`
      query GetUserJobs(
        $statuses: [JobStatus!]!
        $kinds: [JobKind!]
        $jobUuids: [UUID!]
        $first: Int
        $after: String
        $orderBy: String
      ) {
        jobs(statuses: $statuses, kinds: $kinds, jobUuids: $jobUuids, first: $first, after: $after, orderBy: $orderBy) {
          edges {
            cursor
            node {
              id
              uuid
              kind
              status
              error
              result
              args
              createdAt
              updatedAt
              cost
            }
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
        }
      }
    `;

    const orderBy = direction === 'DESC' ? `-${sort}` : sort;

    interface Response {
      jobs: RelayConnection<Job>;
    }

    return this.query<Response>({
      query: FETCH_USER_JOBS,
      variables: { statuses, kinds, jobUuids, first, after, orderBy },
      fetchPolicy: 'network-only',
    }).pipe(
      map(({ jobs }) => ({
        jobs: jobs.edges.map((edge) => edge.node),
        pageInfo: jobs.pageInfo,
      })),
    );
  }

  retryJobs(jobUuids: string[]) {
    const RETRY_JOBS = gql`
      mutation RetryJobs($jobUuids: [UUID!]!) {
        retryJobs(jobUuids: $jobUuids) {
          success
          message
          jobs {
            id
            uuid
            kind
            status
            error
            result
            createdAt
            updatedAt
            cost
          }
        }
      }
    `;

    interface Response {
      retryJobs: {
        success: boolean;
        message: string;
        jobs: Job[];
      };
    }

    return this.mutate<Response>({
      mutation: RETRY_JOBS,
      variables: { jobUuids },
    }).pipe(
      map((data) => {
        if (!data.retryJobs.success) {
          throw new Error(data.retryJobs.message);
        }
        return data.retryJobs;
      }),
    );
  }

  deleteJobs(jobUuids: string[]) {
    const DELETE_JOBS = gql`
      mutation DeleteJobs($jobUuids: [UUID!]!) {
        deleteJobs(jobUuids: $jobUuids) {
          success
          message
        }
      }
    `;

    interface Response {
      deleteJobs: {
        success: boolean;
        message: string;
      };
    }

    return this.mutate<Response>({
      mutation: DELETE_JOBS,
      variables: { jobUuids },
    }).pipe(
      map((data) => {
        if (!data.deleteJobs.success) {
          throw new Error(data.deleteJobs.message);
        }
        return data.deleteJobs;
      }),
    );
  }
}
