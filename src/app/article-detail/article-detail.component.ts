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
    });
  }

  updateArticle(): void {
    this.articleService.updateArticle(this.article.id, this.updatedContent).subscribe(() => {
      // this.messageService.addMessage({
      //   type: 'success',
      //   text: 'Article updated successfully.',
      //   dismissible: true,
      // });
    });
  }

  protected readonly of = of;
}
