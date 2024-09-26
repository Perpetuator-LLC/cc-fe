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
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatExpansionPanel, MatExpansionPanelHeader, MatExpansionPanelTitle } from '@angular/material/expansion';
import { MatTooltip } from '@angular/material/tooltip';
import { Router } from '@angular/router';

export interface CryptoNewsResult {
  id: string;
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: string;
  content: string;
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
    MatProgressSpinner,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    MatTooltip,
  ],
  templateUrl: './crypto-news.component.html',
  styleUrl: './crypto-news.component.scss',
})
export class CryptoNewsComponent implements OnInit, OnDestroy {
  newsData: CryptoNewsData | null = null;
  private subscriptions: Subscription = new Subscription();
  filteredNews: CryptoNewsResult[] = [];
  selectedNews = new Set<CryptoNewsResult>();
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;

  constructor(
    private cryptoNewsService: CryptoNewsService,
    private messageService: MessageService,
    private toolbarService: ToolbarService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const viewContainerRef = this.toolbarService.getViewContainerRef();
    viewContainerRef.clear();
    viewContainerRef.createEmbeddedView(this.toolbarTemplate);
    this.messageService.clearMessages();
    this.getNews();
    this.filteredNews = this.newsData?.results || [];
  }

  extractSelectedNews() {
    this.messageService.clearMessages();
    if (this.selectedNews.size === 0) {
      this.messageService.addMessage({
        type: 'warning',
        text: 'No news items selected.',
        dismissible: true,
      });
      return;
    }
    this.messageService.addMessage({
      type: 'info',
      text: 'Extracting content from selected news items (this may take a while)...',
      dismissible: true,
    });

    const newsIds = [...this.selectedNews].map((entry) => Number(entry.id));
    this.subscriptions.add(
      this.cryptoNewsService.extractCryptoNews(newsIds).subscribe({
        next: (data) => {
          this.messageService.clearMessages();
          if (data.success) {
            this.messageService.addMessage({
              type: 'success',
              text: data.message,
              dismissible: true,
            });
          } else {
            this.messageService.addMessage({
              type: 'error',
              text: data.message,
              dismissible: true,
            });
          }
        },
        error: (err: { message: string }) => {
          this.messageService.addMessage({
            type: 'error',
            text: `Failed to extract news data: ${err.message}`,
            dismissible: true,
          });
        },
      }),
    );
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
    }
    this.messageService.addMessage({
      type: 'info',
      text: 'Summarizing content of selected news items (this may take a while)...',
      dismissible: true,
    });

    const newsIds = [...this.selectedNews].map((entry) => Number(entry.id));
    this.subscriptions.add(
      this.cryptoNewsService.summarizeCryptoNews(newsIds).subscribe({
        next: (data) => {
          this.messageService.clearMessages();
          if (data.success) {
            this.messageService.addMessage({
              type: 'success',
              text: data.message,
              dismissible: true,
            });
          } else {
            this.messageService.addMessage({
              type: 'error',
              text: data.message,
              dismissible: true,
            });
          }
        },
        error: (err: { message: string }) => {
          this.messageService.addMessage({
            type: 'error',
            text: `Failed to summarize news data: ${err.message}`,
            dismissible: true,
          });
        },
      }),
    );
  }

  createArticleFromSelected() {
    this.messageService.clearMessages();
    if (this.selectedNews.size === 0) {
      this.messageService.addMessage({
        type: 'warning',
        text: 'No news items selected.',
        dismissible: true,
      });
      return;
    }
    this.messageService.addMessage({
      type: 'info',
      text: 'Creating crypto article from selected news items (this may take a while)...',
      dismissible: true,
    });

    const newsIds = [...this.selectedNews].map((entry) => Number(entry.id));
    this.subscriptions.add(
      this.cryptoNewsService.createCryptoArticle(newsIds).subscribe({
        next: (data) => {
          this.messageService.clearMessages();
          if (data.success) {
            this.messageService.addMessage({
              type: 'success',
              text: data.message,
              dismissible: true,
            });
            this.router.navigate(['/article-detail', data.results.id]);
            // Optionally handle the article data
            console.log('Article Data:', data.results);
          } else {
            this.messageService.addMessage({
              type: 'error',
              text: data.message,
              dismissible: true,
            });
          }
        },
        error: (err: { message: string }) => {
          this.messageService.addMessage({
            type: 'error',
            text: `Failed to create crypto article: ${err.message}`,
            dismissible: true,
          });
        },
      }),
    );
  }

  // Update summarizeSelected to chain the new APIs if needed
  // summarizeSelected() {
  //   this.messageService.clearMessages();
  //   if (this.selectedNews.size === 0) {
  //     this.messageService.addMessage({
  //       type: 'warning',
  //       text: 'No news items selected.',
  //       dismissible: true,
  //     });
  //     return;
  //   }
  //
  //   this.messageService.addMessage({
  //     type: 'info',
  //     text: 'Processing selected news items (this may take a while)...',
  //     dismissible: true,
  //   });
  //
  //   const newsIds = [...this.selectedNews].map((entry) => Number(entry.id));
  //
  //   this.subscriptions.add(
  //     this.cryptoNewsService
  //       .extractCryptoNews(newsIds)
  //       .pipe(
  //         switchMap((extractData) => {
  //           this.messageService.clearMessages();
  //           if (!extractData.success) {
  //             throw new Error(extractData.message);
  //           }
  //           this.messageService.addMessage({
  //             type: 'success',
  //             text: extractData.message,
  //             dismissible: true,
  //           });
  //           return this.cryptoNewsService.summarizeCryptoNews(newsIds);
  //         }),
  //         switchMap((summarizeData) => {
  //           if (!summarizeData.success) {
  //             throw new Error(summarizeData.message);
  //           }
  //           this.messageService.addMessage({
  //             type: 'success',
  //             text: summarizeData.message,
  //             dismissible: true,
  //           });
  //           return this.cryptoNewsService.createCryptoArticle(newsIds);
  //         }),
  //       )
  //       .subscribe({
  //         next: (createArticleData) => {
  //           this.messageService.clearMessages();
  //           if (createArticleData.success) {
  //             this.messageService.addMessage({
  //               type: 'success',
  //               text: 'Crypto news summarized successfully.',
  //               dismissible: true,
  //             });
  //             // Optionally handle the article data
  //             console.log('Article Data:', createArticleData.results);
  //           } else {
  //             this.messageService.addMessage({
  //               type: 'error',
  //               text: createArticleData.message,
  //               dismissible: true,
  //             });
  //           }
  //         },
  //         error: (err: { message: string }) => {
  //           this.messageService.addMessage({
  //             type: 'error',
  //             text: `Failed to process news data: ${err.message}`,
  //             dismissible: true,
  //           });
  //         },
  //       }),
  //   );
  // }

  fetchNews() {
    this.messageService.clearMessages();
    this.messageService.addMessage({
      type: 'info',
      text: 'Fetching crypto news data...',
      dismissible: true,
    });
    this.subscriptions.add(
      this.cryptoNewsService.fetchCryptoNews().subscribe({
        next: () => {
          this.messageService.clearMessages();
          this.messageService.addMessage({
            type: 'success',
            text: 'Crypto news data fetched successfully.',
            dismissible: true,
          });
        },
        error: (err: { message: string }) => {
          this.messageService.clearMessages();
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
      }),
    );
  }

  getNews() {
    // this.messageService.addMessage({
    //   type: 'info',
    //   text: 'Loading crypto news data...',
    //   dismissible: true,
    // });
    this.subscriptions.add(
      this.cryptoNewsService.getCryptoNews().subscribe({
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
      }),
    );
  }

  selectLast12Hours() {
    const now = new Date();
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000); // 12 hours ago

    this.selectedNews.clear();
    this.filteredNews.forEach((news) => {
      const publishedDate = new Date(news.publishedAt);
      if (publishedDate >= twelveHoursAgo && publishedDate <= now) {
        this.selectedNews.add(news);
      }
    });
  }

  applyFilter(target: EventTarget | null) {
    const element = target as HTMLInputElement;
    const filterValue = element?.value;

    if (!filterValue) {
      this.filteredNews = this.newsData?.results || [];
      return;
    }

    let lowerCaseFilter = filterValue.toLowerCase();
    let isNegated = false;

    if (lowerCaseFilter.startsWith('-')) {
      isNegated = true;
      lowerCaseFilter = lowerCaseFilter.substring(1); // Remove the '-' at the beginning
      lowerCaseFilter = lowerCaseFilter.trim(); // Remove any leading/trailing whitespace
    }

    if (isNegated) {
      this.filteredNews =
        this.newsData?.results.filter(
          (news: CryptoNewsResult) =>
            !(
              news.title.toLowerCase().includes(lowerCaseFilter) ||
              news.description.toLowerCase().includes(lowerCaseFilter) ||
              news.summary.toLowerCase().includes(lowerCaseFilter) ||
              news.source.toLowerCase().includes(lowerCaseFilter)
            ),
        ) || [];
    } else {
      this.filteredNews =
        this.newsData?.results.filter(
          (news: CryptoNewsResult) =>
            news.title.toLowerCase().includes(lowerCaseFilter) ||
            news.description.toLowerCase().includes(lowerCaseFilter) ||
            news.summary.toLowerCase().includes(lowerCaseFilter) ||
            news.source.toLowerCase().includes(lowerCaseFilter),
        ) || [];
    }
  }

  selectAll() {
    this.selectedNews = new Set(this.filteredNews);
  }

  unselectAll() {
    this.selectedNews.clear();
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
    this.subscriptions.unsubscribe();
    this.toolbarService.clearToolbarComponent();
  }
}
