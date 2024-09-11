import { Component, Input, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { MatCard, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatList, MatListItem } from '@angular/material/list';
import { MatIcon } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import { MatLine } from '@angular/material/core';
import { MatDivider } from '@angular/material/divider';
import { SlicePipe } from '@angular/common';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MessageComponent } from '../message/message.component';
import { ToolbarService } from '../toolbar.service';
import { MessageService } from '../message.service';
import { CryptoArticleService } from '../crypto-article.service';
import { Subscription } from 'rxjs';

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
  ],
  templateUrl: './articles-list.component.html',
  styleUrl: './articles-list.component.scss',
})
export class ArticlesListComponent implements OnInit, OnDestroy {
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;
  private subscription: Subscription | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() articles: any[] = [];

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
    this.subscription = this.articleService.getCryptoArticles().subscribe({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      next: (response: any) => {
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
        console.log('Retrieve crypto articles complete');
      },
    });
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
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    this.toolbarService.clearToolbarComponent();
  }
}
