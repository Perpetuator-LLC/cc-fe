import { Component, OnInit, TemplateRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CryptoArticleData, Article, CryptoArticleService } from '../crypto-article.service';
import { CryptoNewsResult } from '../crypto-news/crypto-news.component';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from '../message.service';
import { ToolbarService } from '../toolbar.service';
import { MatList, MatListItem } from '@angular/material/list';
import { MessageComponent } from '../message/message.component';
import { JobStatusBarComponent } from '../job-status-bar/job-status-bar.component';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatDivider } from '@angular/material/divider';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatLine } from '@angular/material/core';
import { DatePipe } from '@angular/common';
import { MatTooltip } from '@angular/material/tooltip';
import { MatButton } from '@angular/material/button';
import { MatInput } from '@angular/material/input';
import { Subscription } from 'rxjs';
import { JobType, stringToJobType } from '../job.service';

export interface UpdateCryptoArticleData {
  success: boolean;
  message: string;
}

export interface UpdateCryptoArticleAudio {
  success: boolean;
  message: string;
}

export interface PublishCryptoArticleAudio {
  success: boolean;
  message: string;
}

@Component({
  selector: 'app-article-detail',
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
  ],
  templateUrl: './article-detail.component.html',
  styleUrl: './article-detail.component.scss',
})
export class ArticleDetailComponent implements OnInit, AfterViewInit, OnDestroy {
  private subscriptions: Subscription = new Subscription();
  article: Article = {
    id: '',
    title: '',
    content: '',
    date: '',
    audio: '',
    newsSummaries: [],
    team: {
      id: 0,
      name: '',
      podcastEnabled: false,
      podcastUrl: '',
      podcastSlug: '',
      members: [],
      intro: '',
      prompt: '',
      outro: '',
    },
  };
  team = { id: 0, name: '', podcastEnabled: false, podcastUrl: '', podcastSlug: '', members: [] };
  linkedArticles: CryptoNewsResult[] = [];
  updatedTitle = '';
  updatedContent = '';
  audioSrc: string | null = null; // Add audioSrc to store the audio URL
  downloadLink: string | null = null; // Add downloadLink to store the download URL

  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;
  @ViewChild(JobStatusBarComponent) jobStatusBar!: JobStatusBarComponent;

  constructor(
    private route: ActivatedRoute,
    private messageService: MessageService,
    private toolbarService: ToolbarService,
    private articleService: CryptoArticleService,
  ) {}

  ngOnInit(): void {
    const viewContainerRef = this.toolbarService.getViewContainerRef();
    viewContainerRef.clear();
    viewContainerRef.createEmbeddedView(this.toolbarTemplate);
    const articleId = this.route.snapshot.paramMap.get('id');
    this.subscriptions.add(
      this.articleService.getCryptoArticleById(articleId).subscribe({
        next: (data: CryptoArticleData) => {
          if (!data.success) {
            this.messageService.error(data.message);
            return;
          }
          this.article = data.article;
          this.updatedTitle = this.article.title;
          this.updatedContent = this.article.content;
          this.linkedArticles = this.article.newsSummaries;
          this.team.name = this.article.team.name;
          this.team.id = Number(this.article.team.id);

          if (this.article.audio) {
            this.prepareAudioPlayer(this.article.audio);
          }
        },
        error: (err) => {
          this.messageService.error(`Failed to fetch article: ${err.message}`);
        },
      }),
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.toolbarService.clearToolbarComponent();
  }

  ngAfterViewInit() {
    this.subscriptions.add(
      this.jobStatusBar.jobCompleted$.subscribe((job) => {
        if ([JobType.UPDATE_CRYPTO_ARTICLE_AUDIO].includes(stringToJobType(job.jobType))) {
          this.subscriptions.add(
            this.articleService.getCryptoArticleById(this.article.id).subscribe({
              next: (data) => {
                if (data.success && data.article.audio) {
                  this.prepareAudioPlayer(data.article.audio); // Update audio player with the newly generated audio
                }
              },
              error: (err) => {
                this.messageService.error(`Failed to fetch updated audio for article: ${err.message}`);
              },
            }),
          );
        } else if ([JobType.CREATE_CRYPTO_ARTICLE].includes(stringToJobType(job.jobType))) {
          const newArticleUrl = `/crypto-article/${job.result}`;
          this.messageService.success(`New article URL: <a href="${newArticleUrl}">${newArticleUrl}</a>`, null, true);
        }
      }),
    );
  }

  prepareAudioPlayer(base64Audio: string): void {
    // Decode the base64 audio and create a Blob
    const byteCharacters = atob(base64Audio);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'audio/mpeg' });

    // Create a URL for the Blob and set it to the audio source
    this.audioSrc = URL.createObjectURL(blob);
    this.downloadLink = this.audioSrc; // Also enable the download link
  }

  requestPublishFeedback(): void {
    const message =
      'We do not currently support publishing. Please write an email to ' +
      '<a href="mailto:support@perpetuator.com?subject=Publishing%20Request&body=' +
      'Please%20explain%20where%20you%20would%20like%20to%20publish%20this%20audio.">our support email</a> ' +
      'explaining where you would like to publish this audio as we are currently integrating new systems.';
    this.messageService.info(message, null, true);
  }

  publishAudio(): void {
    this.subscriptions.add(
      this.articleService.publishAudio(this.article.id).subscribe(() => {
        this.messageService.success('Audio file published successfully.');
      }),
    );
  }

  downloadAudio(): void {
    if (this.downloadLink) {
      const a = document.createElement('a');
      a.href = this.downloadLink;
      a.download = `crypto_article_${this.article.id}.mp3`; // Set the download file name
      a.click(); // Programmatically trigger the download
    }
  }

  generateAudio(): void {
    if (!this.article.id || this.article.id === '') {
      this.messageService.warning('No article provided for audio generation.');
      return;
    }
    this.subscriptions.add(
      this.articleService.generateAudio(this.article.id).subscribe({
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
          this.jobStatusBar.addJob(data.job);
        },
        error: (err) => {
          this.messageService.error(err.message);
        },
      }),
    );
  }

  updateArticle(): void {
    this.subscriptions.add(
      this.articleService.updateArticle(this.article.id, this.updatedTitle, this.updatedContent).subscribe({
        next: (response) => {
          if (!response.success) {
            this.messageService.error(response.message);
            return;
          }
          this.messageService.success('Article updated successfully.');
        },
        error: (err) => {
          this.messageService.error(err.message);
        },
      }),
    );
  }
}
