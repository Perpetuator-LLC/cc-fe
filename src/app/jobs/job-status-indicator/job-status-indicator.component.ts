// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, computed, effect, inject } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuTrigger } from '@angular/material/menu';
import { MatTooltip } from '@angular/material/tooltip';
import { JobService, JobStatus, stringToJobStatus } from '../job.service';
import { JobStatusBarComponent } from '../job-status-bar/job-status-bar.component';
import { TerminalWebSocketService } from '../../terminal/terminal-websocket.service';

/**
 * Compact job status indicator for the toolbar.
 * Shows an icon with badge when jobs are running/pending.
 * Clicking opens a dropdown with the full job status bar.
 *
 * This component also ensures the TerminalWebSocketService is instantiated
 * so that job updates are received via WebSocket on all pages.
 */
@Component({
  selector: 'app-job-status-indicator',
  standalone: true,
  imports: [MatIconButton, MatIcon, MatMenu, MatMenuTrigger, MatTooltip, JobStatusBarComponent],
  templateUrl: './job-status-indicator.component.html',
  styleUrl: './job-status-indicator.component.scss',
})
export class JobStatusIndicatorComponent {
  private jobService = inject(JobService);

  // Inject TerminalWebSocketService to ensure it's instantiated and connected
  // This is critical - without this, job updates won't be received via WebSocket
  // on pages that don't otherwise use terminal features
  private terminalWsService = inject(TerminalWebSocketService);

  // JobService.jobs is already a WritableSignal
  private jobs = this.jobService.jobs;

  // Expose connection state so we can show WebSocket status if needed
  // This also ensures the terminalWsService isn't tree-shaken in production
  isWebSocketConnected = computed(() => this.terminalWsService.connectionState() === 'connected');

  // Debug effect to trace job updates
  private debugEffect = effect(() => {
    const wsState = this.terminalWsService.connectionState();
    const jobCount = this.jobs().length;
    const activeCount = this.activeJobCount();
    console.log(`[JobIndicator] WS: ${wsState}, Total jobs: ${jobCount}, Active: ${activeCount}`);
  });

  activeJobCount = computed(() => {
    return this.jobs().filter((job) => {
      const status = stringToJobStatus(job.status);
      return status === JobStatus.PENDING || status === JobStatus.RUNNING;
    }).length;
  });

  hasActiveJobs = computed(() => this.activeJobCount() > 0);

  hasRunningJobs = computed(() => {
    return this.jobs().some((job) => stringToJobStatus(job.status) === JobStatus.RUNNING);
  });
}
