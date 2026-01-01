// Copyright (c) 2025-2026 Perpetuator LLC
import { Injectable, OnDestroy, signal, WritableSignal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Subject, Subscription, timer } from 'rxjs';
import { createClient, Client } from 'graphql-ws';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { Job } from './job.service';

// GraphQL subscription for job updates
const JOB_UPDATES_SUBSCRIPTION = `
  subscription JobUpdates {
    jobUpdates {
      type
      job {
        uuid
        kind
        status
        error
        result
        createdAt
        updatedAt
      }
    }
  }
`;

// GraphQL query for initial jobs
const GET_JOBS_QUERY = `
  query GetJobs($limit: Int) {
    jobs(limit: $limit) {
      id
      uuid
      kind
      status
      error
      result
      createdAt
      updatedAt
    }
  }
`;

@Injectable({
  providedIn: 'root',
})
export class JobsWebSocketService implements OnDestroy {
  private client: Client | null = null;
  private subscriptions = new Subscription();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimer: Subscription | null = null;
  private activeSubscriptions = new Map<string, () => void>();

  // Public signals
  readonly jobs: WritableSignal<Job[]> = signal([]);
  readonly isConnected: WritableSignal<boolean> = signal(false);
  readonly connectionError: WritableSignal<string | null> = signal(null);

  // Observable versions for components that prefer observables
  readonly jobs$ = toObservable(this.jobs);
  readonly isConnected$ = toObservable(this.isConnected);
  readonly connectionError$ = toObservable(this.connectionError);

  // Subject for job-specific events
  private readonly jobUpdatedSubject = new Subject<Job>();
  readonly jobUpdated$ = this.jobUpdatedSubject.asObservable();

  private readonly jobCompletedSubject = new Subject<Job>();
  readonly jobCompleted$ = this.jobCompletedSubject.asObservable();

  private readonly jobFailedSubject = new Subject<Job>();
  readonly jobFailed$ = this.jobFailedSubject.asObservable();

  constructor(private authService: AuthService) {
    // Auto-connect when user is authenticated
    this.subscriptions.add(
      toObservable(this.authService.isLoggedIn).subscribe((isLoggedIn) => {
        if (isLoggedIn) {
          this.connect();
        } else {
          this.disconnect();
        }
      }),
    );
  }

  ngOnDestroy(): void {
    this.disconnect();
    this.subscriptions.unsubscribe();
  }

  /**
   * Connect to the GraphQL WebSocket for job updates
   */
  connect(): void {
    if (this.client) {
      return;
    }

    const token = this.authService.getToken();
    if (!token) {
      console.warn('[JobsWS] No access token available');
      return;
    }

    const wsProtocol = environment.API_URL.startsWith('https') ? 'wss' : 'ws';
    const host = environment.API_URL.replace(/^https?:\/\//, '');
    const url = `${wsProtocol}://${host}/ws/graphql/`;

    console.log('[JobsWS] Connecting to GraphQL WebSocket...');

    this.client = createClient({
      url,
      connectionParams: {
        authToken: token,
      },
      retryAttempts: this.maxReconnectAttempts,
      shouldRetry: () => true,
      on: {
        connected: () => {
          console.log('[JobsWS] GraphQL WebSocket connected');
          this.isConnected.set(true);
          this.connectionError.set(null);
          this.reconnectAttempts = 0;
          this.subscribeToJobUpdates();
          this.loadInitialJobs();
        },
        closed: (event) => {
          console.log('[JobsWS] GraphQL WebSocket closed', event);
          this.isConnected.set(false);
          this.cleanupSubscriptions();
        },
        error: (error) => {
          console.error('[JobsWS] GraphQL WebSocket error:', error);
          this.connectionError.set(error instanceof Error ? error.message : 'Connection error');
          this.isConnected.set(false);
        },
      },
    });
  }

  /**
   * Disconnect from the GraphQL WebSocket
   */
  disconnect(): void {
    this.cleanupSubscriptions();

    if (this.reconnectTimer) {
      this.reconnectTimer.unsubscribe();
      this.reconnectTimer = null;
    }

    if (this.client) {
      this.client.dispose();
      this.client = null;
    }

    this.isConnected.set(false);
    this.jobs.set([]);
  }

  /**
   * Subscribe to real-time job updates
   */
  private subscribeToJobUpdates(): void {
    if (!this.client) return;

    const unsubscribe = this.client.subscribe(
      { query: JOB_UPDATES_SUBSCRIPTION },
      {
        next: (result) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const data = result.data as any;
          if (data?.jobUpdates) {
            this.handleJobUpdate(data.jobUpdates);
          }
        },
        error: (error) => {
          console.error('[JobsWS] Subscription error:', error);
        },
        complete: () => {
          console.log('[JobsWS] Subscription completed');
        },
      },
    );

    this.activeSubscriptions.set('jobUpdates', unsubscribe);
  }

  /**
   * Load initial jobs via GraphQL query over WebSocket
   */
  private loadInitialJobs(): void {
    if (!this.client) return;

    this.client.subscribe(
      { query: GET_JOBS_QUERY, variables: { limit: 50 } },
      {
        next: (result) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const data = result.data as any;
          if (data?.jobs) {
            const allJobs = data.jobs as Job[];
            // Filter to only pending/running jobs (jobs that need monitoring)
            const activeJobs = allJobs.filter((job) => ['PENDING', 'RUNNING', 'QUEUED'].includes(job.status));
            console.log(`[JobsWS] Initial jobs: ${allJobs.length} -> filtered: ${activeJobs.length}`);
            this.jobs.set(activeJobs);
          }
        },
        error: (error) => {
          console.error('[JobsWS] Failed to load initial jobs:', error);
        },
        complete: () => {
          // Query completed
        },
      },
    );
  }

  /**
   * Handle incoming job update from subscription
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleJobUpdate(update: { type: string; job: any }): void {
    const { type, job } = update;
    console.log(`[JobsWS] Job update: ${type}`, job.uuid, job.status);

    switch (type) {
      case 'job.created':
      case 'job.started':
        this.addOrUpdateJob(job);
        this.jobUpdatedSubject.next(job);
        break;

      case 'job.progress':
        this.updateJobStatus(job);
        this.jobUpdatedSubject.next(job);
        break;

      case 'job.completed':
        this.updateJobStatus(job);
        this.jobCompletedSubject.next(job);
        // Remove from active jobs after a short delay
        timer(2000).subscribe(() => this.removeJob(job.uuid));
        break;

      case 'job.failed':
        this.updateJobStatus(job);
        this.jobFailedSubject.next(job);
        // Remove from active jobs after a longer delay
        timer(5000).subscribe(() => this.removeJob(job.uuid));
        break;

      default:
        console.warn(`[JobsWS] Unknown job update type: ${type}`);
    }
  }

  /**
   * Add or update a job in the jobs list
   */
  private addOrUpdateJob(job: Job): void {
    this.jobs.update((jobs) => {
      const index = jobs.findIndex((j) => j.uuid === job.uuid);
      if (index >= 0) {
        const updated = [...jobs];
        updated[index] = job;
        return updated;
      } else {
        return [job, ...jobs];
      }
    });
  }

  /**
   * Update job status
   */
  private updateJobStatus(job: Job): void {
    this.jobs.update((jobs) => {
      const index = jobs.findIndex((j) => j.uuid === job.uuid);
      if (index >= 0) {
        const updated = [...jobs];
        updated[index] = job;
        return updated;
      }
      return jobs;
    });
  }

  /**
   * Remove a job from the list
   */
  private removeJob(uuid: string): void {
    this.jobs.update((jobs) => jobs.filter((j) => j.uuid !== uuid));
  }

  /**
   * Get a specific job by UUID
   */
  getJob(uuid: string): Job | undefined {
    return this.jobs().find((j) => j.uuid === uuid);
  }

  /**
   * Get jobs by status
   */
  getJobsByStatus(status: string): Job[] {
    return this.jobs().filter((j) => j.status === status);
  }

  /**
   * Add a single job to the list
   */
  addJob(job: Job): void {
    this.addOrUpdateJob(job);
  }

  /**
   * Add multiple jobs to the list
   */
  addJobs(jobs: Job[]): void {
    jobs.forEach((job) => this.addOrUpdateJob(job));
  }

  /**
   * Clean up active subscriptions
   */
  private cleanupSubscriptions(): void {
    this.activeSubscriptions.forEach((unsubscribe) => {
      try {
        unsubscribe();
      } catch {
        // Ignore cleanup errors
      }
    });
    this.activeSubscriptions.clear();
  }
}
