// Copyright (c) 2025. Capital Copilot
import { Component, OnInit, TemplateRef, ViewChild, OnDestroy } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Episode, EpisodeService } from '../episode.service';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MessageService } from '../message.service';
import { ToolbarService } from '../toolbar.service';
import { MatList, MatListItem } from '@angular/material/list';
import { MessageComponent } from '../message/message.component';
import { JobStatusBarComponent } from '../job-status-bar/job-status-bar.component';
import { MatCard, MatCardHeader, MatCardContent } from '@angular/material/card';
import { MatDivider } from '@angular/material/divider';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatLine } from '@angular/material/core';
import { DatePipe } from '@angular/common';
import { MatTooltip } from '@angular/material/tooltip';
import { MatAnchor, MatButton } from '@angular/material/button';
import { MatInput } from '@angular/material/input';
import { Subscription } from 'rxjs';
import { Job, JobService, JobStatus, JobKind, stringToJobKind } from '../job.service';
import { MatIcon } from '@angular/material/icon';
import { MatCheckbox } from '@angular/material/checkbox';
import { toObservable } from '@angular/core/rxjs-interop';
import { FetchPolicy } from '@apollo/client';
import { SvgIconComponent } from '../svg-icon/svg-icon.component';
import { MatTabsModule } from '@angular/material/tabs';
import { MatMenuTrigger, MatMenu } from '@angular/material/menu';

@Component({
  selector: 'app-episode-detail',
  standalone: true,
  imports: [
    FormsModule,
    MatListItem,
    MessageComponent,
    MatList,
    JobStatusBarComponent,
    MatCardContent,
    MatCard,
    MatDivider,
    MatLabel,
    MatFormField,
    MatLine,
    DatePipe,
    MatTooltip,
    MatButton,
    MatInput,
    MatIcon,
    MatCheckbox,
    ReactiveFormsModule,
    RouterLink,
    MatAnchor,
    SvgIconComponent,
    MatCardHeader,
    MatTabsModule,
    MatMenu,
    MatMenuTrigger,
  ],
  templateUrl: './episode-detail.component.html',
  styleUrl: './episode-detail.component.scss',
})
export class EpisodeDetailComponent implements OnInit, OnDestroy {
  private subscriptions: Subscription = new Subscription();
  episodeForm: FormGroup;
  audioSrc: string | null = null;
  wordCount = 0;
  charCount = 0;
  jobs: Job[] = [];
  isGridView = false;

  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;
  @ViewChild(JobStatusBarComponent) jobStatusBar!: JobStatusBarComponent;
  private episodeUuid: string;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private messageService: MessageService,
    private toolbarService: ToolbarService,
    private episodeService: EpisodeService,
    private jobService: JobService,
  ) {
    const uuid = this.route.snapshot.paramMap.get('uuid');
    if (!uuid) {
      throw new Error('Failed to get Episode ID from route.');
    }
    this.episodeUuid = uuid;

    this.episodeForm = this.fb.group({
      id: [{ value: '', disabled: true }, Validators.required],
      uuid: [{ value: '', disabled: true }, Validators.required],
      isLive: [false, Validators.required],
      title: ['', Validators.required],
      description: ['', Validators.required],
      content: ['', Validators.required],
      date: ['', Validators.required],
      audioBase64: ['', Validators.required],
      podcastDate: ['', Validators.required],
      telegramDate: ['', Validators.required],
      news: this.fb.array([]),
      podcast: this.fb.group({
        id: [{ value: '', disabled: true }],
        uuid: [{ value: '', disabled: true }],
        name: [{ value: '', disabled: true }],
      }),
    });
    this.subscriptions.add(
      toObservable(this.jobService.jobs).subscribe({
        next: (jobs) => {
          this.jobService.getJobTransitions(jobs, this.jobs, JobStatus.COMPLETED).forEach((job) => {
            if ([JobKind.UPDATE_EPISODE_AUDIO].includes(stringToJobKind(job.kind))) {
              this.subscriptions.add(
                this.episodeService.getEpisodeById(this.episodeUuid, 'network-only' as FetchPolicy).subscribe({
                  next: (episode) => {
                    if (episode.audioUrl) {
                      this.audioSrc = episode.audioUrl;
                    }
                  },
                  error: (err) => {
                    this.messageService.error(`Failed to fetch updated audio for episode: ${err.message}`);
                  },
                }),
              );
            } else if ([JobKind.CREATE_EPISODE].includes(stringToJobKind(job.kind))) {
              this.subscriptions.add(
                this.episodeService.getEpisodeById(job.result).subscribe({
                  next: (episode) => {
                    const newEpisodeUrl = `/episode/${job.result}`;
                    this.messageService.success(
                      `New episode: <a href="${newEpisodeUrl}">${episode.title}</a>`,
                      null,
                      true,
                    );
                  },
                  error: (error) => {
                    this.messageService.error(`Failed to get new episode: ${error.message}`);
                  },
                }),
              );
            }
          });
          this.jobs = jobs;
        },
        error: (error) => {
          this.messageService.error(`Failed to load jobs signal: ${error.message}`);
        },
      }),
    );
  }

  toggleView(isGrid: boolean) {
    this.isGridView = isGrid;
  }

  ngOnInit(): void {
    const viewContainerRef = this.toolbarService.getViewContainerRef();
    viewContainerRef.clear();
    viewContainerRef.createEmbeddedView(this.toolbarTemplate);

    this.subscriptions.add(
      this.episodeService.getEpisodeById(this.episodeUuid).subscribe({
        next: (episode) => {
          this.episodeForm.patchValue(episode);

          const newsFormArray = this.episodeForm.get('news') as FormArray;
          newsFormArray.clear();
          for (const newsSummary of episode.news) {
            newsFormArray.push(this.fb.group(newsSummary));
          }

          this.audioSrc = episode.audioUrl;
        },
        error: (err) => {
          this.messageService.error(`Failed to fetch episode: ${err.message}`);
        },
      }),
    );
    this.subscriptions.add(
      this.episodeForm.get('content')?.valueChanges.subscribe((value: string) => {
        this.wordCount = this.countWords(value);
        this.charCount = value.length;
      }),
    );
  }

  private countWords(text: string): number {
    return text ? text.trim().split(/\s+/).length : 0;
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.toolbarService.clearToolbarComponent();
  }

  publishAudio(): void {
    this.messageService.info('Audio file publishing...');
    this.subscriptions.add(
      this.episodeService.publishAudio(this.episodeUuid).subscribe({
        next: (response) => {
          this.messageService.success('Audio file published successfully.');
          this.episodeForm.patchValue(response.episode);
        },
        error: (err) => {
          this.messageService.error(err.message);
        },
      }),
    );
  }

  onIsLiveChange(isLive: boolean) {
    this.episodeForm.value.isLive = isLive;
    this.updateEpisode();
  }

  downloadAudio(): void {
    if (this.audioSrc) {
      const a = document.createElement('a');
      a.href = this.audioSrc;
      a.download = `episode_${this.episodeUuid}.mp3`; // Set the download file name
      a.click(); // Programmatically trigger the download
    }
  }

  generateAudio(): void {
    this.subscriptions.add(
      this.episodeService.generateAudio(this.episodeUuid).subscribe({
        next: (data) => {
          if (!data.success) {
            this.messageService.error(data.message);
            return;
          }
          if (!data.job) {
            this.messageService.error('No job returned for audio generation.');
            return;
          }
          this.messageService.info('Generating audio file...');
          this.jobService.addJob(data.job);
        },
        error: (err) => {
          this.messageService.error(err.message);
        },
      }),
    );
  }

  updateEpisode(): void {
    const formValues = this.episodeForm.getRawValue() as Episode;
    this.subscriptions.add(
      this.episodeService
        .updateEpisode(formValues.uuid, formValues.title, formValues.description, formValues.content, formValues.isLive)
        .subscribe({
          next: (response) => {
            if (!response.success) {
              this.messageService.error(response.message);
              return;
            }
            this.messageService.success('Episode updated successfully.');
            this.episodeForm.patchValue(response.episode);
          },
          error: (err) => {
            this.messageService.error(err.message);
          },
        }),
    );
  }
}
