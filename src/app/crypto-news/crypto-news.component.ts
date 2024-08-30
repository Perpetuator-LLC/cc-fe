import { Component, OnInit, OnDestroy, ViewChild, TemplateRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { CryptoNewsService } from '../crypto-news.service';
import { DatePipe } from '@angular/common';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatList, MatListItem } from '@angular/material/list';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatInput } from '@angular/material/input';
import { MessageService } from '../message.service';
import { MessageComponent } from '../message/message.component';
import { ToolbarService } from '../toolbar.service';
import { MatButton } from '@angular/material/button';

export interface CryptoNewsResult {
  id: string;
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: string;
  summary: string;
}

export interface CryptoNewsData {
  success: boolean;
  message: string;
  results: CryptoNewsResult[];
}

@Component({
  selector: 'app-crypto-news',
  standalone: true,
  imports: [
    DatePipe,
    MatFormField,
    MatLabel,
    MatList,
    MatListItem,
    MatCard,
    MatCardTitle,
    MatCardHeader,
    MatCheckbox,
    MatCardContent,
    MatInput,
    MessageComponent,
    MatButton,
  ],
  templateUrl: './crypto-news.component.html',
  styleUrl: './crypto-news.component.scss',
})
export class CryptoNewsComponent implements OnInit, OnDestroy {
  newsData: CryptoNewsData | null = null;
  private subscription: Subscription | undefined;
  filteredNews: CryptoNewsResult[] = [];
  selectedNews = new Set<CryptoNewsResult>();
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;

  constructor(
    private cryptoNewsService: CryptoNewsService,
    private messageService: MessageService,
    private toolbarService: ToolbarService,
  ) {}

  ngOnInit(): void {
    const viewContainerRef = this.toolbarService.getViewContainerRef();
    viewContainerRef.clear();
    viewContainerRef.createEmbeddedView(this.toolbarTemplate);
    this.messageService.clearMessages();
    this.getNews();
    this.filteredNews = this.newsData?.results || [];
  }

  summarizeSelected() {
    this.messageService.clearMessages();
    if (this.selectedNews.size === 0) {
      this.messageService.addMessage({
        type: 'warning',
        text: 'No news items selected.',
        dismissible: true,
      });
      return;
    } else {
      this.messageService.addMessage({
        type: 'info',
        text: 'Summarizing crypto news data (this may take awhile)...',
        dismissible: true,
      });
    }
    const newsIds = [...this.selectedNews].map((entry) => Number(entry.id));
    this.subscription = this.cryptoNewsService.summarizeCryptoNews(newsIds).subscribe({
      next: () => {
        this.messageService.clearMessages();
        this.messageService.addMessage({
          type: 'success',
          text: 'Crypto news data summarized successfully.',
          dismissible: true,
        });
      },
      error: (err: { message: string }) => {
        // this.messageService.clearMessages(); // leave for debug?
        this.messageService.addMessage({
          type: 'error',
          text: `Failed to summarize crypto news data: ${err.message}`,
          dismissible: true,
        });
      },
      complete: () => {
        console.log('News data summarize complete');
      },
    });
  }

  fetchNews() {
    this.messageService.clearMessages();
    this.messageService.addMessage({
      type: 'info',
      text: 'Fetching crypto news data...',
      dismissible: true,
    });
    this.subscription = this.cryptoNewsService.fetchCryptoNews().subscribe({
      next: () => {
        this.messageService.clearMessages();
        this.messageService.addMessage({
          type: 'success',
          text: 'Crypto news data fetched successfully.',
          dismissible: true,
        });
      },
      error: (err: { message: string }) => {
        // this.messageService.clearMessages(); // leave for debug?
        this.messageService.addMessage({
          type: 'error',
          text: `Failed to fetch crypto news data: ${err.message}`,
          dismissible: true,
        });
      },
      complete: () => {
        console.debug('News data fetch complete');
        this.getNews();
      },
    });
  }

  getNews() {
    // this.messageService.addMessage({
    //   type: 'info',
    //   text: 'Loading crypto news data...',
    //   dismissible: true,
    // });
    this.subscription = this.cryptoNewsService.getCryptoNews().subscribe({
      next: (data: CryptoNewsData) => {
        // this.messageService.clearMessages();
        this.newsData = data;
        this.filteredNews = this.newsData?.results || [];
      },
      error: (err: { message: string }) => {
        this.messageService.addMessage({
          type: 'error',
          text: `Failed to get crypto news data: ${err.message}`,
          dismissible: true,
        });
      },
      complete: () => {
        console.debug('News data fetch complete');
      },
    });
  }

  applyFilter(target: EventTarget | null) {
    const element = target as HTMLInputElement;
    const filterValue = element?.value;
    if (!filterValue) {
      this.filteredNews = this.newsData?.results || [];
      return;
    }
    const lowerCaseFilter = filterValue.toLowerCase();
    this.filteredNews =
      this.newsData?.results.filter(
        (news: CryptoNewsResult) =>
          news.title.toLowerCase().includes(lowerCaseFilter) ||
          news.description.toLowerCase().includes(lowerCaseFilter) ||
          news.source.toLowerCase().includes(lowerCaseFilter),
      ) || [];
  }

  toggleSelection(news: CryptoNewsResult) {
    if (this.selectedNews.has(news)) {
      this.selectedNews.delete(news);
    } else {
      this.selectedNews.add(news);
    }
  }

  isSelected(news: CryptoNewsResult): boolean {
    return this.selectedNews.has(news);
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    this.toolbarService.clearToolbarComponent();
  }
}
