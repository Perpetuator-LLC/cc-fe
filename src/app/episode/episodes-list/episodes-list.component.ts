// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, OnDestroy, OnInit, TemplateRef, ViewChild, inject } from '@angular/core';
import { MatCard, MatCardContent } from '@angular/material/card';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import {
  CreateEpisodeDialogComponent,
  CreateEpisodeDialogResult,
} from '../create-episode-dialog/create-episode-dialog.component';
import { SelectTopicDialogComponent } from '../../topics/select-topic-dialog/select-topic-dialog.component';
import { EpisodesTableComponent } from '../episodes-table/episodes-table.component';
import { MessageService } from '../../message.service';
import { ToolbarService } from '../../layout/toolbar.service';
import { PodcastsService } from '../../podcast/podcasts.service';
import { ResearchService, Topic } from '../../topics/research.service';
import { NewsService } from '../../news/news.service';
import { JobService, Job } from '../../jobs/job.service';
import { LoadingService } from '../../layout/loading.service';
import { PodcastsResult } from '../../podcast/podcasts.service';

@Component({
  selector: 'app-episodes-list',
  standalone: true,
  imports: [MatButton, MatCard, MatIcon, MatCardContent, CommonModule, EpisodesTableComponent],
  templateUrl: './episodes-list.component.html',
  styleUrls: ['./episodes-list.component.scss'],
})
export class EpisodesListComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private messageService = inject(MessageService);
  private toolbarService = inject(ToolbarService);
  private podcastsService = inject(PodcastsService);
  private dialog = inject(MatDialog);
  private newsService = inject(NewsService);
  private jobService = inject(JobService);
  private researchService = inject(ResearchService);
  private loadingService = inject(LoadingService);

  private subscriptions = new Subscription();
  topics: Topic[] = [];
  podcasts: PodcastsResult[] = [];
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;

  ngOnInit(): void {
    this.toolbarService.setToolbarTemplate(this.toolbarTemplate);

    this.loadTopics();
    this.loadPodcasts();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  loadTopics() {
    this.subscriptions.add(
      this.researchService.getTopics(undefined, 100).subscribe({
        next: (response) => {
          this.topics = response.topics;
        },
        error: (err) => {
          this.messageService.error(err.message);
        },
      }),
    );
  }

  loadPodcasts() {
    this.subscriptions.add(
      this.podcastsService.getPodcastsForFilter().subscribe({
        next: (response) => {
          // Filter to only podcasts where user has publisher or owner rights
          this.podcasts = response.podcasts.filter((podcast) =>
            podcast.team?.members.some((member) => member.role === 'publisher' || member.role === 'owner'),
          );
        },
        error: (err) => {
          this.messageService.error(`Failed to load podcasts: ${err.message}`);
        },
      }),
    );
  }

  openCreateEpisodeDialog() {
    const dialogRef = this.dialog.open(CreateEpisodeDialogComponent, {
      width: '600px',
      panelClass: 'create-episode-dialog-panel',
      data: {
        podcasts: this.podcasts,
      },
    });

    dialogRef.afterClosed().subscribe((result: CreateEpisodeDialogResult) => {
      if (!result) return;

      switch (result.episodeType) {
        case 'blank':
          this.createBlankEpisode(result.podcastUuid);
          break;
        case 'news':
          this.createNewsEpisode(result.podcastUuid);
          break;
        case 'research':
          this.createResearchEpisode(result.podcastUuid);
          break;
      }
    });
  }

  private createBlankEpisode(podcastUuid: string): void {
    const newsUuids: string[] = [];
    this.subscriptions.add(
      this.newsService.createEpisode(newsUuids, podcastUuid).subscribe({
        next: (data: { job: Job | null }) => {
          if (!data.job) {
            this.messageService.error('Failed to create episode: No job returned');
            return;
          }
          this.messageService.info('Creating blank episode...');
          this.jobService.addJob(data.job);
        },
        error: (err: { message: string }) => {
          this.messageService.error(err.message);
        },
      }),
    );
  }

  private createNewsEpisode(podcastUuid: string): void {
    this.subscriptions.add(
      this.podcastsService.createLatestNewsEpisodeChain(podcastUuid).subscribe({
        next: (data: { jobs: Job[] }) => {
          if (!data.jobs || data.jobs.length === 0) {
            this.messageService.error('Failed to create news episode: No jobs returned');
            return;
          }
          this.messageService.info('Creating news episode from latest news...');
          data.jobs.forEach((job) => {
            this.jobService.addJob(job);
          });
        },
        error: (err: { message: string }) => {
          this.messageService.error(err.message);
        },
      }),
    );
  }

  private createResearchEpisode(podcastUuid: string): void {
    const dialogRef = this.dialog.open(SelectTopicDialogComponent, {
      width: '600px',
      data: {
        podcastUuid,
        topics: this.topics,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.topicUuid) {
        this.subscriptions.add(
          this.researchService.publishResearchTopicEpisodeChain(podcastUuid, result.topicUuid).subscribe({
            next: (data) => {
              if (!data.jobs || data.jobs.length === 0) {
                this.messageService.error('Failed to create research episode: No jobs returned');
                return;
              }
              this.messageService.info('Creating research episode from topic...');
              data.jobs.forEach((job) => {
                this.jobService.addJob(job);
              });
            },
            error: (err: { message: string }) => {
              this.messageService.error(err.message);
            },
          }),
        );
      }
    });
  }
}
