import { Component, Input, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { MatCard, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatList, MatListItem } from '@angular/material/list';
import { MatIcon } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import { MatLine } from '@angular/material/core';
import { MatDivider } from '@angular/material/divider';
import { DatePipe, SlicePipe } from '@angular/common';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MessageComponent } from '../message/message.component';
import { ToolbarService } from '../toolbar.service';
import { MessageService } from '../message.service';
import { CryptoArticleService } from '../crypto-article.service';
import { Subscription } from 'rxjs';
import { CryptoArticlesData } from '../article-detail/article-detail.component';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatTooltip } from '@angular/material/tooltip';
import { MatChip, MatChipListbox } from '@angular/material/chips';

@Component({
  selector: 'app-articles-list',
  standalone: true,
  imports: [
    MatCard,
    MatCardTitle,
    MatCardHeader,
    MatList,
    MatListItem,
    MatIcon,
    RouterLink,
    MatLine,
    MatDivider,
    SlicePipe,
    MatFormField,
    MatInput,
    MatLabel,
    MessageComponent,
    DatePipe,
    MatProgressSpinner,
    MatTooltip,
    MatChip,
    MatChipListbox,
  ],
  templateUrl: './articles-list.component.html',
  styleUrl: './articles-list.component.scss',
})
export class ArticlesListComponent implements OnInit, OnDestroy {
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;
  private subscriptions = new Subscription();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() articles: any[] = [];
  protected loading = false;

  constructor(
    private router: Router,
    private messageService: MessageService,
    private toolbarService: ToolbarService,
    private articleService: CryptoArticleService,
  ) {}

  ngOnInit(): void {
    this.messageService.clearMessages();
    const viewContainerRef = this.toolbarService.getViewContainerRef();
    viewContainerRef.clear();
    viewContainerRef.createEmbeddedView(this.toolbarTemplate);
    this.loading = true;
    this.subscriptions.add(
      this.articleService.getCryptoArticles().subscribe({
        next: (response: CryptoArticlesData) => {
          this.messageService.clearMessages();
          if (response.success) {
            this.articles = response.results;
          } else {
            this.messageService.addMessage({
              type: 'error',
              text: 'No crypto articles were returned.',
              dismissible: true,
            });
          }
        },
        error: (err: { message: string }) => {
          this.messageService.clearMessages();
          this.messageService.addMessage({
            type: 'error',
            text: `Failed to retrieve crypto articles data: ${err.message}`,
            dismissible: true,
          });
        },
        complete: () => {
          this.loading = false;
          console.log('Retrieve crypto articles complete');
        },
      }),
    );
    // this.subscription = this.articleService.getCryptoArticles().subscribe({ (response: any) => {
    //   if (response.success) {
    //     this.articles = response.results;
    //   }
    // });
  }

  viewArticle(id: string) {
    this.router.navigate(['/crypto-article', id]);
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.toolbarService.clearToolbarComponent();
  }
}
