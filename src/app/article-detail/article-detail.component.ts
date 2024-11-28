import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CryptoArticleData, Article, CryptoArticleService } from '../crypto-article.service';
import { TeamsResult } from '../teams-list/teams-list.component';
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
export class ArticleDetailComponent implements OnInit {
  article: Article = {
    id: '',
    title: '',
    content: '',
    date: '',
    audio: '',
    newsSummaries: [],
    team: { id: 0, name: '', podcastEnabled: false, podcastUrl: '', podcastSlug: '', members: [] },
  };
  team: TeamsResult = { id: 0, name: '', podcastEnabled: false, podcastUrl: '', podcastSlug: '', members: [] };
  linkedArticles: CryptoNewsResult[] = [];
  updatedTitle = '';
  updatedContent = '';
  audioSrc: string | null = null; // Add audioSrc to store the audio URL
  downloadLink: string | null = null; // Add downloadLink to store the download URL

  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;

  constructor(
    private route: ActivatedRoute,
    private messageService: MessageService,
    private toolbarService: ToolbarService,
    private articleService: CryptoArticleService,
  ) {}

  ngOnInit(): void {
    this.messageService.clearMessages();
    const viewContainerRef = this.toolbarService.getViewContainerRef();
    viewContainerRef.clear();
    viewContainerRef.createEmbeddedView(this.toolbarTemplate);
    const articleId = this.route.snapshot.paramMap.get('id');
    this.articleService.getCryptoArticleById(articleId).subscribe({
      next: (data: CryptoArticleData) => {
        if (!data.success) {
          this.messageService.addMessage({
            type: 'error',
            text: data.message,
            dismissible: true,
          });
          return;
        }
        this.article = data.results;
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
        this.messageService.addMessage({
          type: 'error',
          text: `Failed to fetch article: ${err.message}`,
          dismissible: true,
        });
      },
    });
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
    this.messageService.clearMessages();
    this.messageService.addMessage({
      type: 'info',
      text:
        'We do not currently support publishing. Please write an email to ' +
        '<a href="mailto:support@perpetuator.com?subject=Publishing%20Request&body=' +
        'Please%20explain%20where%20you%20would%20like%20to%20publish%20this%20audio.">our support email</a> ' +
        'explaining where you would like to publish this audio as we are currently integrating new systems.',
      dismissible: true,
    });
  }

  publishAudio(): void {
    this.articleService.publishAudio(this.article.id).subscribe(() => {
      this.messageService.clearMessages();
      this.messageService.addMessage({
        type: 'success',
        text: 'Audio file published successfully.',
        dismissible: true,
      });
    });
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
    this.articleService.generateAudio(this.article.id).subscribe({
      next: () => {
        this.messageService.clearMessages();
        this.messageService.addMessage({
          type: 'success',
          text: 'Audio file generated successfully.',
          dismissible: true,
        });

        // After generating, we need to fetch the article again to get the audio field

        this.articleService.getCryptoArticleById(this.article.id).subscribe({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          next: (response: any) => {
            if (response.success && response.results.audio) {
              this.prepareAudioPlayer(response.results.audio); // Update audio player with the newly generated audio
            }
          },
          error: (err) => {
            this.messageService.clearMessages();
            this.messageService.addMessage({
              type: 'error',
              text: `Failed to fetch updated audio for article: ${err.message}`,
              dismissible: true,
            });
          },
        });
      },
      error: (err) => {
        this.messageService.clearMessages();
        this.messageService.addMessage({
          type: 'error',
          text: err.message,
          dismissible: true,
        });
      },
    });
  }

  updateArticle(): void {
    this.articleService.updateArticle(this.article.id, this.updatedTitle, this.updatedContent).subscribe(() => {
      this.messageService.clearMessages();
      this.messageService.addMessage({
        type: 'success',
        text: 'Article updated successfully.',
        dismissible: true,
      });
    });
  }
}
