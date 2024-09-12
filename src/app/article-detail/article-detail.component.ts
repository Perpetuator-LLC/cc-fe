import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CryptoArticleService } from '../crypto-article.service';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatFormField } from '@angular/material/form-field';
import { MatInput, MatLabel } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatDivider } from '@angular/material/divider';
import { MatList, MatListItem } from '@angular/material/list';
import { MatLine } from '@angular/material/core';
import { SlicePipe } from '@angular/common';
import { of } from 'rxjs';
import { MessageComponent } from '../message/message.component';
import { MessageService } from '../message.service';
import { ToolbarService } from '../toolbar.service';

export interface CryptoNewsSummaryData {
  summary: string;
  id: string;
  url: string;
}

export interface CryptoArticleData {
  date: string;
  content: string;
  news_summaries: CryptoNewsSummaryData[];
}

export interface CryptoArticlesData {
  success: boolean;
  message: string;
  results: CryptoArticleData[];
}

export interface UpdateCryptoArticleData {
  success: boolean;
  message: string;
}

export interface UpdateCryptoArticleAudio {
  success: boolean;
  message: string;
}

@Component({
  selector: 'app-article-detail',
  standalone: true,
  imports: [
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatFormField,
    MatLabel,
    FormsModule,
    MatButton,
    MatInput,
    MatDivider,
    MatList,
    MatListItem,
    MatLine,
    RouterLink,
    SlicePipe,
    MessageComponent,
    MatCardContent,
  ],
  templateUrl: './article-detail.component.html',
  styleUrl: './article-detail.component.scss',
})
export class ArticleDetailComponent implements OnInit {
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  article: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  linkedArticles: any[] = [];
  updatedContent = '';
  audioSrc: string | null = null; // Add audioSrc to store the audio URL

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.articleService.getCryptoArticleById(articleId).subscribe((response: any) => {
      if (!response.success) {
        this.messageService.addMessage({
          type: 'error',
          text: response.message,
          dismissible: true,
        });
        return;
      }
      this.article = response.results[0];
      this.updatedContent = this.article.content;
      this.linkedArticles = this.article.newsSummaries;

      if (this.article.audio) {
        this.prepareAudioPlayer(this.article.audio);
      }
    });
  }

  prepareAudioPlayer(base64Audio: string): void {
    const byteCharacters = atob(base64Audio);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'audio/mpeg' });
    this.audioSrc = URL.createObjectURL(blob);
  }

  generateAudio(): void {
    this.articleService.generateAudio(this.article.id).subscribe(() => {
      this.messageService.clearMessages();
      this.messageService.addMessage({
        type: 'success',
        text: 'Audio file generated successfully.',
        dismissible: true,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.articleService.getCryptoArticleById(this.article.id).subscribe((response: any) => {
        if (response.success && response.results[0].audio) {
          this.prepareAudioPlayer(response.results[0].audio);
        }
      });
    });
  }

  updateArticle(): void {
    this.articleService.updateArticle(this.article.id, this.updatedContent).subscribe(() => {
      this.messageService.clearMessages();
      this.messageService.addMessage({
        type: 'success',
        text: 'Article updated successfully.',
        dismissible: true,
      });
    });
  }

  protected readonly of = of;
}
